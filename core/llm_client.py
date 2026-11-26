import time
import random
import re
import logging
from typing import AsyncGenerator

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    import ollama
except ImportError:
    ollama = None

from config import Config
from core.persona import build_system_prompt
from core.context import ContextCompressor

logger = logging.getLogger("NAVI_LLM")

class LLMRouter:
    """
    3-Tier Cognitive LLM Router with:
    - Circuit Breakers & Exponential Recovery Cooldowns with Jitter
    - Prompt Injection Vector Detection & Neutralization
    - Sensitive Secret Redaction in Diagnostics
    - Context Compression & Token Budget Optimization
    1. Primary (Online): Groq LPU (ultra-low latency)
    2. Secondary Cloud Backup: Google Gemini Flash (gemini-3.5-flash-lite)
    3. Offline Fallback: Ollama (llama3.2:3b / 8b)
    """

    def __init__(self):
        # 1. Primary: Groq LPU
        if Config.GROQ_API_KEY and AsyncOpenAI is not None:
            self.groq_client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=Config.GROQ_API_KEY
            )
            self.groq_model = Config.GROQ_MODEL
        else:
            self.groq_client = None

        # Optional: NVIDIA NIM API (only used if NVIDIA_API_KEY is explicitly set)
        if Config.NVIDIA_API_KEY and AsyncOpenAI is not None:
            self.nvidia_client = AsyncOpenAI(
                base_url=Config.NVIDIA_BASE_URL,
                api_key=Config.NVIDIA_API_KEY
            )
            self.nvidia_model = Config.NVIDIA_MODEL
        else:
            self.nvidia_client = None

        # 2. Secondary: Gemini Flash
        if Config.GEMINI_API_KEY and genai is not None:
            self.gemini_client = genai.Client(api_key=Config.GEMINI_API_KEY)
            self.gemini_model = Config.GEMINI_MODEL
        else:
            self.gemini_client = None

        # Circuit breaker cooldown trackers (epoch seconds)
        self.circuit_cooldown_until = {
            "groq": 0.0,
            "nvidia": 0.0,
            "gemini": 0.0,
        }
        self.cooldown_base_seconds = {
            "groq": 20.0,
            "nvidia": 25.0,
            "gemini": 15.0,
        }
        # API availability, failure, and fallback telemetry
        self.provider_stats = {
            p: {"calls": 0, "successes": 0, "failures": 0, "fallbacks": 0, "last_error": None, "last_ok_ts": 0.0}
            for p in ("groq", "nvidia", "gemini", "ollama")
        }

        if not self.groq_client and not self.gemini_client and not self.nvidia_client:
            logger.warning("No cloud LLM keys found. Operating in local Ollama fallback mode.")

    @staticmethod
    def sanitize_prompt(prompt: str) -> tuple[str, bool]:
        """Detects prompt injection attempts and neutralizes override patterns."""
        injection_patterns = [
            r"(ignore|disregard)\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)",
            r"you\s+are\s+now\s+(in\s+)?(a\s+)?.*?\b(DAN|jailbreak|jailbroken|unfiltered)\b",
            r"\b(DAN\s+mode|jailbreak\s+mode)\b",
            r"system\s*override",
            r"bypass\s+all\s+(rules|restrictions|guardrails)",
        ]
        is_injection = False
        clean = prompt
        for pat in injection_patterns:
            if re.search(pat, clean, re.IGNORECASE):
                is_injection = True
                clean = re.sub(pat, "[FILTERED_OVERRIDE_ATTEMPT]", clean, flags=re.IGNORECASE)

        return clean, is_injection

    @staticmethod
    def redact_secrets(text: str) -> str:
        """Redacts credentials and tokens from diagnostic logs."""
        return re.sub(
            r'(nvapi-[a-zA-Z0-9_-]{15,}|AIzaSy[a-zA-Z0-9_-]{30,}|livekit_[a-zA-Z0-9_-]+|gsk_[a-zA-Z0-9_-]{20,})',
            '[REDACTED_API_KEY]',
            str(text)
        )

    async def stream_reply(self, prompt: str, history: list = None, system_instruction_override: str = None) -> AsyncGenerator[str, None]:
        """
        Streams response tokens through the 3-tier cognitive hierarchy
        with circuit breakers, sanitization, and sliding window compression.
        """
        sanitized_prompt, is_injection = self.sanitize_prompt(prompt)
        if is_injection:
            logger.warning(f"Prompt injection attempt neutralized: '{self.redact_secrets(prompt[:50])}'")

        # Context compression for token budget preservation
        compressed_history = ContextCompressor.compress_history(history or [], max_turns=10)
        system_instruction = system_instruction_override or build_system_prompt()
        now = time.time()

        # Tier 1: Primary Groq LPU (Ultra-Low Latency, skipped as primary when AI_PROVIDER=gemini)
        if Config.AI_PROVIDER.lower() != "gemini" and self.groq_client and now >= self.circuit_cooldown_until["groq"]:
            try:
                messages = [{"role": "system", "content": system_instruction}]
                if compressed_history:
                    messages.extend(compressed_history)
                messages.append({"role": "user", "content": sanitized_prompt})

                stream = await self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=messages,
                    temperature=0.7,
                    stream=True,
                    timeout=3.0
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        yield content
                self.circuit_cooldown_until["groq"] = 0.0
                return
            except Exception as e:
                cooldown_jitter = random.uniform(2.0, 5.0)
                self.circuit_cooldown_until["groq"] = now + self.cooldown_base_seconds["groq"] + cooldown_jitter
                safe_err = self.redact_secrets(str(e))
                logger.error(f"Groq API failure ({safe_err}). Failing over to Gemini Flash...")

        # Optional: NVIDIA LLM API (only if configured)
        if self.nvidia_client and now >= self.circuit_cooldown_until["nvidia"]:
            try:
                messages = [{"role": "system", "content": system_instruction}]
                if compressed_history:
                    messages.extend(compressed_history)
                messages.append({"role": "user", "content": sanitized_prompt})

                stream = await self.nvidia_client.chat.completions.create(
                    model=self.nvidia_model,
                    messages=messages,
                    temperature=0.7,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        yield content
                # Successful execution resets cooldown
                self.circuit_cooldown_until["nvidia"] = 0.0
                return
            except Exception as e:
                cooldown_jitter = random.uniform(2.0, 7.0)
                self.circuit_cooldown_until["nvidia"] = now + self.cooldown_base_seconds["nvidia"] + cooldown_jitter
                safe_err = self.redact_secrets(str(e))
                logger.error(f"NVIDIA API failure ({safe_err}). Circuit opened for {self.cooldown_base_seconds['nvidia']:.0f}s. Failing over to Gemini Flash...")

        # Tier 2: Secondary Cloud Backup (Gemini Flash)
        if self.gemini_client and now >= self.circuit_cooldown_until["gemini"]:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
                contents = []
                if compressed_history:
                    for item in compressed_history:
                        role = "user" if item.get("role") == "user" else "model"
                        text = item.get("content", "")
                        if text:
                            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=sanitized_prompt)]))

                if hasattr(self.gemini_client, "aio") and hasattr(self.gemini_client.aio, "models"):
                    response = await self.gemini_client.aio.models.generate_content_stream(
                        model=self.gemini_model,
                        contents=contents,
                        config=config,
                    )
                    async for chunk in response:
                        if chunk.text:
                            yield chunk.text
                else:
                    response = self.gemini_client.models.generate_content_stream(
                        model=self.gemini_model,
                        contents=contents,
                        config=config,
                    )
                    for chunk in response:
                        if chunk.text:
                            yield chunk.text
                self.circuit_cooldown_until["gemini"] = 0.0
                return
            except Exception as e:
                cooldown_jitter = random.uniform(1.0, 4.0)
                self.circuit_cooldown_until["gemini"] = now + self.cooldown_base_seconds["gemini"] + cooldown_jitter
                safe_err = self.redact_secrets(str(e))
                logger.error(f"Gemini Flash failure ({safe_err}). Circuit opened for {self.cooldown_base_seconds['gemini']:.0f}s. Failing over to local Ollama...")

        # Tier 3: Local Offline Fallback (Ollama)
        async for chunk in self._stream_ollama(sanitized_prompt, system_instruction, history=compressed_history):
            yield chunk

    @staticmethod
    def validate_tool_call(raw_text: str, allowed_tools: list = None) -> tuple[bool, dict | None, str]:
        """
        Validates and extracts a structured tool-call JSON object from LLM output.
        Strips markdown code fences and checks required fields ('action' or 'tool' and 'target'/'args').
        """
        import json
        text = (raw_text or "").strip()
        if not text:
            return False, None, "Empty model output"

        # Strip ```json ... ``` fences commonly emitted by local Ollama models
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
        if fence_match:
            text = fence_match.group(1).strip()
        else:
            # Extract outermost JSON object if wrapped in prose
            brace_match = re.search(r"\{[\s\S]*\}", text)
            if brace_match:
                text = brace_match.group(0).strip()

        try:
            parsed = json.loads(text)
        except Exception as e:
            return False, None, f"Invalid JSON: {e}"

        if not isinstance(parsed, dict):
            return False, None, "Tool call must be a JSON object"

        tool_name = parsed.get("action") or parsed.get("tool") or parsed.get("name")
        if not isinstance(tool_name, str) or not tool_name.strip():
            return False, None, "Missing non-empty 'action'/'tool' string"

        tool_name = tool_name.strip()
        if allowed_tools is not None and tool_name not in allowed_tools:
            return False, None, f"Tool '{tool_name}' is not in allowed_tools: {allowed_tools}"

        args = parsed.get("args", parsed.get("arguments"))
        if args is not None and not isinstance(args, dict):
            return False, None, "'args'/'arguments' must be a JSON object when provided"

        normalized = {
            "action": tool_name,
            "target": str(parsed.get("target", "")),
            "args": args or {},
        }
        return True, normalized, ""

    async def generate_validated_tool_call(
        self,
        prompt: str,
        allowed_tools: list = None,
        max_retries: int = 2,
    ) -> dict:
        """
        Generates a tool call and validates/retries if offline Ollama emits malformed JSON.
        """
        schema_hint = (
            "Respond ONLY with valid JSON: "
            '{"action": "<tool_name>", "target": "<string>", "args": {}}'
        )
        if allowed_tools:
            schema_hint += f". Allowed tools: {allowed_tools}"

        current_prompt = f"{prompt}\n\n{schema_hint}"
        last_err = ""
        for attempt in range(max_retries + 1):
            chunks = []
            async for tok in self.stream_reply(
                current_prompt,
                system_instruction_override="You are a strict JSON tool-calling engine. Output ONLY raw JSON.",
            ):
                chunks.append(tok)
            raw = "".join(chunks)
            ok, parsed, err = self.validate_tool_call(raw, allowed_tools=allowed_tools)
            if ok:
                return {"ok": True, "tool_call": parsed, "attempts": attempt + 1}
            last_err = err
            logger.warning(f"Tool-call validation failed (attempt {attempt + 1}): {err}")
            current_prompt = (
                f"Your previous output was invalid ({err}). "
                f"Original request: {prompt}\n{schema_hint}"
            )
        return {"ok": False, "error": last_err, "attempts": max_retries + 1}

    async def _stream_ollama(self, prompt: str, system_instruction: str, history: list = None) -> AsyncGenerator[str, None]:
        self.provider_stats["ollama"]["calls"] += 1
        try:
            client = ollama.AsyncClient(host=Config.OLLAMA_BASE_URL)
            messages = [{"role": "system", "content": system_instruction}]
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": prompt})
            response = await client.chat(
                model=Config.OLLAMA_MODEL,
                messages=messages,
                stream=True
            )
            async for part in response:
                content = part.get("message", {}).get("content", "")
                if content:
                    yield content
            self.provider_stats["ollama"]["successes"] += 1
            self.provider_stats["ollama"]["last_ok_ts"] = time.time()
        except Exception as e:
            safe_err = self.redact_secrets(str(e))
            self.provider_stats["ollama"]["failures"] += 1
            self.provider_stats["ollama"]["last_error"] = safe_err
            logger.critical(f"All 3 LLM Tiers failed (NVIDIA, Gemini, Ollama): {safe_err}")
            yield "Reasoning engine unavailable. Please check system logs."


async def serve_ai_router(port: int = 5008):
    """Unified local HTTP AI Router service consumed by both Python and Tauri Rust."""
    from aiohttp import web

    router = LLMRouter()

    async def handle_health(_req):
        now = time.time()
        circuits = {
            k: max(0.0, round(v - now, 1))
            for k, v in router.circuit_cooldown_until.items()
        }
        return web.json_response({
            "status": "ok",
            "service": "unified-llm-router",
            "circuits_cooldown_sec": circuits,
            "provider_stats": router.provider_stats,
        })

    async def handle_chat(req):
        data = await req.json()
        prompt = str(data.get("prompt", "")).strip()
        history = data.get("history") or []
        system_prompt = data.get("system_prompt")
        if not prompt:
            return web.json_response({"ok": False, "error": "Empty prompt"}, status=400)
        chunks = []
        async for tok in router.stream_reply(prompt, history=history, system_instruction_override=system_prompt):
            chunks.append(tok)
        return web.json_response({"ok": True, "reply": "".join(chunks)})

    async def handle_chat_tool(req):
        data = await req.json()
        prompt = str(data.get("prompt", "")).strip()
        allowed_tools = data.get("allowed_tools")
        max_retries = int(data.get("max_retries", 2))
        if not prompt:
            return web.json_response({"ok": False, "error": "Empty prompt"}, status=400)
        res = await router.generate_validated_tool_call(prompt, allowed_tools=allowed_tools, max_retries=max_retries)
        return web.json_response(res, status=200 if res.get("ok") else 422)

    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_post("/chat", handle_chat)
    app.router.add_post("/chat_tool", handle_chat_tool)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", port)
    await site.start()
    print(f"[Unified AI Router] Listening on http://127.0.0.1:{port}", flush=True)
    import asyncio
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    import asyncio
    import sys
    port = 5008
    if "--serve" in sys.argv:
        idx = sys.argv.index("--serve")
        if idx + 1 < len(sys.argv):
            port = int(sys.argv[idx + 1])
    asyncio.run(serve_ai_router(port))
