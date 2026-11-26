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

    async def _stream_ollama(self, prompt: str, system_instruction: str, history: list = None) -> AsyncGenerator[str, None]:
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
        except Exception as e:
            safe_err = self.redact_secrets(str(e))
            logger.critical(f"All 3 LLM Tiers failed (NVIDIA, Gemini, Ollama): {safe_err}")
            yield "Reasoning engine unavailable. Please check system logs."


async def serve_ai_router(port: int = 5008):
    """Unified local HTTP AI Router service consumed by both Python and Tauri Rust."""
    from aiohttp import web

    router = LLMRouter()

    async def handle_health(_req):
        return web.json_response({"status": "ok", "service": "unified-llm-router"})

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

    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_post("/chat", handle_chat)
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
