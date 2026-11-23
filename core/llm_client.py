import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
from google import genai
from google.genai import types
import ollama
from config import Config
from core.persona import build_system_prompt

logger = logging.getLogger("NAVI_LLM")

class LLMRouter:
    """
    3-Tier Core LLM Router:
    1. Primary (Online): NVIDIA LLM API (meta/llama-3.3-70b-instruct)
    2. Secondary Cloud Backup: Google Gemini Flash
    3. Offline Fallback: Ollama (llama3.2:3b / 8b)
    """

    def __init__(self):
        # 1. Primary: NVIDIA NIM API (Llama 3.3 70B)
        if Config.NVIDIA_API_KEY:
            self.nvidia_client = AsyncOpenAI(
                base_url=Config.NVIDIA_BASE_URL,
                api_key=Config.NVIDIA_API_KEY
            )
            self.nvidia_model = Config.NVIDIA_MODEL
        else:
            self.nvidia_client = None

        # 2. Secondary: Gemini Flash
        if Config.GEMINI_API_KEY:
            self.gemini_client = genai.Client(api_key=Config.GEMINI_API_KEY)
            self.gemini_model = Config.GEMINI_MODEL
        else:
            self.gemini_client = None

        if not self.nvidia_client and not self.gemini_client:
            logger.warning("No cloud LLM keys found. Operating in local Ollama fallback mode.")

    async def stream_reply(self, prompt: str, history: list = None) -> AsyncGenerator[str, None]:
        """
        Streams response tokens through the 3-tier cognitive hierarchy.
        """
        system_instruction = build_system_prompt()

        # Tier 1: Primary NVIDIA LLM API (Llama 3.3 70B)
        if self.nvidia_client:
            try:
                messages = [{"role": "system", "content": system_instruction}]
                if history:
                    messages.extend(history)
                messages.append({"role": "user", "content": prompt})

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
                return
            except Exception as e:
                logger.error(f"NVIDIA API failure ({e}). Failing over to Gemini Flash...")

        # Tier 2: Secondary Cloud Backup (Gemini Flash)
        if self.gemini_client:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
                response = self.gemini_client.models.generate_content_stream(
                    model=self.gemini_model,
                    contents=prompt,
                    config=config,
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.error(f"Gemini Flash failure ({e}). Failing over to local Ollama...")

        # Tier 3: Local Offline Fallback (Ollama)
        async for chunk in self._stream_ollama(prompt, system_instruction):
            yield chunk

    async def _stream_ollama(self, prompt: str, system_instruction: str) -> AsyncGenerator[str, None]:
        try:
            client = ollama.AsyncClient(host=Config.OLLAMA_BASE_URL)
            response = await client.chat(
                model=Config.OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )
            async for part in response:
                content = part.get("message", {}).get("content", "")
                if content:
                    yield content
        except Exception as e:
            logger.critical(f"All 3 LLM Tiers failed (NVIDIA, Gemini, Ollama): {e}")
            yield "Reasoning engine unavailable. Please check system logs."
