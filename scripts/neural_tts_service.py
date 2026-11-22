# J.A.R.V.I.S. Ultra-Realistic Neural Voice Synthesis Engine
# Primary: Kokoro-82M ONNX (Local 82M Parameter Neural Weights, British Male Cadence)
# Multilingual Fallback: te-IN-MohanNeural (Telugu), en-GB-RyanNeural (Edge Cloud)

import asyncio
import io
import os
import sys
from aiohttp import web
import edge_tts
import soundfile as sf

# Resolve model asset paths relative to project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

MODEL_CANDIDATES = [
    os.path.join(PROJECT_ROOT, "models", "kokoro", "kokoro-v0_19.onnx"),
    os.path.join(SCRIPT_DIR, "..", "models", "kokoro", "kokoro-v0_19.onnx"),
    r"C:\Users\Chowdary\Desktop\Project\Jarvis\models\kokoro\kokoro-v0_19.onnx",
]

VOICES_CANDIDATES = [
    os.path.join(PROJECT_ROOT, "models", "kokoro", "voices.bin"),
    os.path.join(SCRIPT_DIR, "..", "models", "kokoro", "voices.bin"),
    r"C:\Users\Chowdary\Desktop\Project\Jarvis\models\kokoro\voices.bin",
]

kokoro_model_path = next((p for p in MODEL_CANDIDATES if os.path.exists(p)), None)
kokoro_voices_path = next((p for p in VOICES_CANDIDATES if os.path.exists(p)), None)

kokoro_engine = None
kokoro_available = False

if kokoro_model_path and kokoro_voices_path:
    try:
        from kokoro_onnx import Kokoro
        print(f"[Neural TTS] Initializing Kokoro-82M from {kokoro_model_path}...", flush=True)
        kokoro_engine = Kokoro(kokoro_model_path, kokoro_voices_path)
        kokoro_available = True
        print(f"[Neural TTS] Kokoro-82M loaded successfully! Voices: {kokoro_engine.get_voices()}", flush=True)
    except Exception as e:
        print(f"[Neural TTS Warning] Failed to load Kokoro-82M ({e}). Falling back to Edge-TTS.", file=sys.stderr, flush=True)
else:
    print(f"[Neural TTS Warning] Kokoro model assets not found. Model: {kokoro_model_path}, Voices: {kokoro_voices_path}. Using Edge-TTS.", file=sys.stderr, flush=True)

DEFAULT_KOKORO_VOICE = "am_adam"  # American Male Adam (Default Ultra-Realistic Voice)
DEFAULT_EDGE_VOICE = "en-US-AndrewNeural"

KOKORO_VOICE_MAP = {
    "jarvis": "am_adam",
    "adam": "am_adam",
    "am_adam": "am_adam",
    "default": "am_adam",
    "george": "bm_george",
    "bm_george": "bm_george",
    "paul": "bm_george",
    "lewis": "bm_lewis",
    "bm_lewis": "bm_lewis",
    "michael": "am_michael",
    "am_michael": "am_michael",
    "nicole": "af_nicole",
    "af_nicole": "af_nicole",
    "bella": "af_bella",
    "af_bella": "af_bella",
    "sarah": "af_sarah",
    "af_sarah": "af_sarah",
    "sky": "af_sky",
    "af_sky": "af_sky",
    "emma": "bf_emma",
    "bf_emma": "bf_emma",
    "isabella": "bf_isabella",
    "bf_isabella": "bf_isabella",
}

EDGE_VOICE_MAP = {
    "telugu": "te-IN-MohanNeural",
    "mohan": "te-IN-MohanNeural",
    "te-in-mohanneural": "te-IN-MohanNeural",
    "ryan": "en-GB-RyanNeural",
    "us": "en-US-AndrewNeural",
}

def generate_kokoro_sync(text: str, voice_name: str, speed: float = 1.0) -> bytes:
    """Generate audio synchronously using Kokoro ONNX model and export as WAV bytes."""
    lang = "en-gb" if voice_name.startswith("b") else "en-us"
    samples, sample_rate = kokoro_engine.create(text, voice=voice_name, speed=speed, lang=lang)
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV")
    return buf.getvalue()

async def generate_edge_async(text: str, voice_name: str) -> bytes:
    """Generate audio via Microsoft Edge Neural TTS streaming."""
    communicate = edge_tts.Communicate(text, voice_name)
    audio_bytes = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
    return bytes(audio_bytes)

async def handle_speech(request):
    try:
        data = await request.json()
        text = (data.get("input") or data.get("text") or "").strip()
        if not text:
            return web.Response(status=400, text="Missing input text")

        req_voice = str(data.get("voice", "jarvis")).lower().strip()
        speed = float(data.get("speed", 1.0))
        speed = max(0.6, min(1.8, speed))

        # 1. Automatic Telugu Language Detection (Unicode range 0C00-0C7F)
        has_telugu = any('\u0c00' <= char <= '\u0c7f' for char in text)
        if has_telugu or req_voice in ["telugu", "mohan", "te-in-mohanneural"]:
            target_edge_voice = "te-IN-MohanNeural"
            audio_bytes = await generate_edge_async(text, target_edge_voice)
            return web.Response(
                body=audio_bytes,
                content_type="audio/mpeg",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Cache-Control": "no-cache",
                    "X-Jarvis-Engine": "EdgeNeural-Telugu",
                }
            )

        # 2. Primary Engine: Kokoro-82M Ultra-Realistic Neural Speech
        if kokoro_available and kokoro_engine is not None:
            target_kokoro_voice = KOKORO_VOICE_MAP.get(req_voice, DEFAULT_KOKORO_VOICE)
            try:
                # Offload ONNX inference to worker thread to prevent event loop starvation
                wav_bytes = await asyncio.to_thread(generate_kokoro_sync, text, target_kokoro_voice, speed)
                if wav_bytes and len(wav_bytes) > 100:
                    return web.Response(
                        body=wav_bytes,
                        content_type="audio/wav",
                        headers={
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "POST, OPTIONS",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Cache-Control": "no-cache",
                            "X-Jarvis-Engine": "Kokoro-82M",
                            "X-Jarvis-Voice": target_kokoro_voice,
                        }
                    )
            except Exception as ke:
                print(f"[Neural TTS Kokoro Error]: {ke}. Falling back to Edge-TTS...", file=sys.stderr, flush=True)

        # 3. High-Fidelity Edge-TTS Fallback
        target_edge_voice = EDGE_VOICE_MAP.get(req_voice, DEFAULT_EDGE_VOICE)
        audio_bytes = await generate_edge_async(text, target_edge_voice)
        if len(audio_bytes) == 0:
            return web.Response(status=500, text="Audio generation produced empty buffer")

        return web.Response(
            body=audio_bytes,
            content_type="audio/mpeg",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Cache-Control": "no-cache",
                "X-Jarvis-Engine": "EdgeNeural-Fallback",
                "X-Jarvis-Voice": target_edge_voice,
            }
        )
    except Exception as e:
        print(f"[Neural TTS Error]: {e}", file=sys.stderr, flush=True)
        return web.Response(status=500, text=str(e), headers={"Access-Control-Allow-Origin": "*"})

async def handle_options(request):
    return web.Response(headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    })

async def handle_health(request):
    return web.json_response({
        "status": "online",
        "engine": "Kokoro-82M" if kokoro_available else "EdgeNeural",
        "kokoro_ready": kokoro_available,
        "default_voice": DEFAULT_KOKORO_VOICE if kokoro_available else DEFAULT_EDGE_VOICE,
        "telugu_support": True,
        "voices": kokoro_engine.get_voices() if kokoro_available else list(EDGE_VOICE_MAP.keys())
    }, headers={"Access-Control-Allow-Origin": "*"})

app = web.Application()
app.router.add_post("/v1/audio/speech", handle_speech)
app.router.add_options("/v1/audio/speech", handle_options)
app.router.add_get("/health", handle_health)
app.router.add_get("/", handle_health)

if __name__ == "__main__":
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    print(f"[Neural TTS] Starting J.A.R.V.I.S. Speech Matrix (Kokoro-82M + Edge-TTS) on http://127.0.0.1:{port}...", flush=True)
    web.run_app(app, host="127.0.0.1", port=port, print=None)
