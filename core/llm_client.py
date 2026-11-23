import logging
from typing import AsyncGenerator
from google import genai
from google.genai import types
import ollama
from config import Config
from core.persona import build_system_prompt

logger = logging.getLogger("NAVI_LLM")

class LLMRouter:
    def __init__(self):
        # Configure Gemini with modern google.genai SDK
        if Config.GEMINI_API_KEY:
            self.client = genai.Client(api_key=Config.GEMINI_API_KEY)
            self.model_name = Config.GEMINI_MODEL
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY not set. Operating in offline/fallback mode.")

    async def stream_reply(self, prompt: str, history: list = None) -> AsyncGenerator[str, None]:
        """
        Streams response tokens using modern google.genai SDK.
        Automatically falls back to local Ollama if Gemini API fails.
        """
        if self.client:
            try:
                system_instruction = build_system_prompt()
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
                response = self.client.models.generate_content_stream(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.error(f"Gemini API failure ({e}). Switching to local Ollama fallback...")

        # Fallback to local Ollama
        async for chunk in self._stream_ollama(prompt):
            yield chunk

    async def _stream_ollama(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            client = ollama.AsyncClient(host=Config.OLLAMA_BASE_URL)
            response = await client.chat(
                model=Config.OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": build_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )
            async for part in response:
                content = part.get("message", {}).get("content", "")
                if content:
                    yield content
        except Exception as e:
            logger.critical(f"Both Primary (Gemini) and Local Fallback (Ollama) failed: {e}")
            yield "I am currently unable to reach my reasoning engine."
