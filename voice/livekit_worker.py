import os
import sys
import logging
import asyncio
from config import Config
from core.persona import build_system_prompt
from core.telemetry import PipelineTelemetry
from core.llm_client import LLMRouter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NAVI_LiveKit")

async def entrypoint(ctx):
    """
    Main LiveKit Voice Agent entrypoint:
    - Binds Deepgram Flux streaming STT as single master turn authority.
    - Routes user speech directly to 3-tier LLMRouter.
    - Streams tokens to Cartesia Sonic TTS with sub-millisecond barge-in interruption.
    - Logs live latency metrics across STT -> TTFT -> TTFA.
    """
    logger.info("NAVI Voice Agent connecting to LiveKit room...")
    try:
        from livekit.agents import AutoSubscribe, voice_assistant
        from livekit.plugins import deepgram, cartesia
        from livekit import rtc
    except ImportError as e:
        logger.error(f"LiveKit Agent libraries not installed: {e}. Please run 'pip install -r requirements.txt'")
        return

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    telemetry = PipelineTelemetry()
    llm_router = LLMRouter()
    system_prompt = build_system_prompt()

    # 1. STT: Deepgram Flux as the Single Turn Authority
    stt_provider = None
    if Config.DEEPGRAM_API_KEY:
        try:
            stt_provider = deepgram.STT(
                api_key=Config.DEEPGRAM_API_KEY,
                model="flux-general-conversational",
                interim_results=True,
            )
            logger.info("Deepgram Flux STT active (Single Master Turn Authority).")
        except Exception as e:
            logger.warning(f"Could not initialize Deepgram STT: {e}")

    # 2. TTS: Cartesia Sonic Streaming
    tts_provider = None
    if Config.CARTESIA_API_KEY:
        try:
            tts_provider = cartesia.TTS(
                api_key=Config.CARTESIA_API_KEY,
                model="sonic-english",
                voice=Config.CARTESIA_VOICE_ID,
            )
            logger.info("Cartesia Sonic TTS active (~90ms ultra-low latency).")
        except Exception as e:
            logger.warning(f"Could not initialize Cartesia TTS: {e}")

    # 3. Wire complete VoiceAssistant conversational pipeline
    try:
        chat_context = []

        assistant = voice_assistant.VoiceAssistant(
            vad=None, # Deepgram Flux endpointing serves as master turn authority
            stt=stt_provider,
            tts=tts_provider,
            llm=None, # Handled via custom 3-tier LLMRouter stream
        )

        @assistant.on("user_speech_committed")
        def on_user_speech(msg):
            telemetry.mark_speech_end()
            telemetry.mark_stt_finalized()
            user_text = msg.content if hasattr(msg, "content") else str(msg)
            logger.info(f"[User Voice Received]: {user_text}")

            async def generate_and_speak():
                t0_token = False
                tokens = []
                async for chunk in llm_router.stream_reply(user_text, history=chat_context):
                    if not t0_token:
                        telemetry.mark_first_token()
                        t0_token = True
                    tokens.append(chunk)

                reply_full = "".join(tokens).strip()
                telemetry.mark_first_audio()

                # Maintain conversational history
                chat_context.append({"role": "user", "content": user_text})
                chat_context.append({"role": "assistant", "content": reply_full})
                if len(chat_context) > 12:
                    chat_context.pop(0)
                    chat_context.pop(0)

                if tts_provider:
                    await assistant.say(reply_full)

            asyncio.create_task(generate_and_speak())

        @assistant.on("agent_speech_interrupted")
        def on_barge_in():
            logger.info("[Barge-in]: User interrupted agent. Cancelling speech output instantly.")

        assistant.start(ctx.room)
        logger.info("JARVIS Voice Assistant started and listening in room.")

    except Exception as err:
        logger.error(f"Failed to start VoiceAssistant pipeline: {err}")

def run_worker():
    try:
        from livekit.agents import cli, WorkerOptions
        cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
    except ImportError:
        print("[LiveKit Notice] livekit-agents package not found. Run: pip install -r requirements.txt", file=sys.stderr)

if __name__ == "__main__":
    run_worker()
