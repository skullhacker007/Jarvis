import logging
import asyncio
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import deepgram, cartesia
from config import Config
from core.persona import build_system_prompt
from core.telemetry import PipelineTelemetry

logger = logging.getLogger("NAVI_LiveKit")

async def entrypoint(ctx: JobContext):
    logger.info("NAVI Voice Agent connecting to LiveKit room...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    telemetry = PipelineTelemetry()

    # 1. STT: Deepgram Flux as the Single Turn Authority
    # Using Deepgram's streaming conversational model with built-in endpointing
    stt_provider = deepgram.STT(
        api_key=Config.DEEPGRAM_API_KEY,
        model="flux-general-conversational", # Deepgram conversational endpointing
        interim_results=True,
    )

    # 2. TTS: Cartesia Sonic Streaming
    tts_provider = cartesia.TTS(
        api_key=Config.CARTESIA_API_KEY,
        model="sonic-english",
        voice=Config.CARTESIA_VOICE_ID,
    )

    logger.info("NAVI Voice Pipeline online with unified turn-detection and streaming TTS.")

    # Event handlers for telemetry and speculative turns can be wired into ctx.room listeners
    # LiveKit VoiceAssistant or custom loop binds stt, llm, and tts together.

def run_worker():
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

if __name__ == "__main__":
    run_worker()
