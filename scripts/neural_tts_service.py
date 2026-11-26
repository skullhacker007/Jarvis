# JARVIS Ultra-Realistic Neural Voice Synthesis Engine
# Primary: Kokoro-82M ONNX (Local 82M Parameter Neural Weights, British Male Cadence)
# Multilingual Fallback: te-IN-MohanNeural (Telugu), en-GB-RyanNeural (Edge Cloud)

from collections import OrderedDict
import asyncio
import io
import os
import subprocess
import sys
import tempfile
import time
from aiohttp import web
import edge_tts
import soundfile as sf

# Optimize ONNX / OpenMP thread count for low-latency CPU inference
os.environ.setdefault("OMP_NUM_THREADS", str(min(4, os.cpu_count() or 4)))
os.environ.setdefault("ORT_NUM_THREADS", str(min(4, os.cpu_count() or 4)))

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

def _is_telugu(text: str) -> bool:
    return any('\u0c00' <= char <= '\u0c7f' for char in text)

# Short-phrase LRU audio cache (up to 64 entries for <=120 char phrases)
_TTS_CACHE: OrderedDict[tuple, tuple[bytes, str, str]] = OrderedDict()
_TTS_CACHE_MAX = 64

# Rolling latency & engine metrics
_ENGINE_STATS = {
    "kokoro": {"calls": 0, "failures": 0, "avg_ms": 0.0},
    "edge": {"calls": 0, "failures": 0, "avg_ms": 0.0},
    "piper": {"calls": 0, "failures": 0, "avg_ms": 0.0},
}

def _record_stat(engine: str, elapsed_ms: float, ok: bool):
    st = _ENGINE_STATS[engine]
    st["calls"] += 1
    if not ok:
        st["failures"] += 1
        return
    st["avg_ms"] = round((st["avg_ms"] * 0.8) + (elapsed_ms * 0.2), 1) if st["avg_ms"] > 0 else round(elapsed_ms, 1)

def generate_kokoro_sync(text: str, voice_name: str, speed: float = 1.0) -> bytes:
    """Generate audio synchronously using Kokoro ONNX model and export as WAV bytes."""
    lang = "en-gb" if voice_name.startswith("b") else "en-us"
    samples, sample_rate = kokoro_engine.create(text, voice=voice_name, speed=speed, lang=lang)
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()

def generate_piper_sync(text: str) -> bytes:
    """Offline Piper CLI fallback returning WAV bytes if piper + model are available."""
    model_path = os.getenv("PIPER_MODEL_PATH", os.path.join(PROJECT_ROOT, "models", "piper", "en_GB-alan-medium.onnx"))
    if not os.path.exists(model_path):
        return b""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        tmp_wav = tf.name
    try:
        proc = subprocess.Popen(
            ["piper", "--model", model_path, "--output_file", tmp_wav],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        proc.communicate(input=text.encode("utf-8"), timeout=10)
        if proc.returncode == 0 and os.path.exists(tmp_wav) and os.path.getsize(tmp_wav) > 100:
            with open(tmp_wav, "rb") as f:
                return f.read()
    except Exception:
        pass
    finally:
        try:
            os.remove(tmp_wav)
        except OSError:
            pass
    return b""

# Warm up Kokoro ONNX graph on startup to eliminate first-turn cold-start latency
if kokoro_available and kokoro_engine is not None:
    try:
        _t0 = time.perf_counter()
        _ = generate_kokoro_sync("Ready.", DEFAULT_KOKORO_VOICE, 1.0)
        print(f"[Neural TTS] Kokoro-82M warmed up in {(time.perf_counter() - _t0)*1000:.1f}ms", flush=True)
    except Exception:
        pass

async def generate_edge_async(text: str, voice_name: str) -> bytes:
    """Generate audio via Microsoft Edge Neural TTS streaming."""
    communicate = edge_tts.Communicate(text, voice_name)
    audio_bytes = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
    return bytes(audio_bytes)

def _build_audio_response(body: bytes, content_type: str, engine_name: str, voice_name: str):
    return web.Response(
        body=body,
        content_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-cache",
            "X-Jarvis-Engine": engine_name,
            "X-Jarvis-Voice": voice_name,
        },
    )

async def handle_speech(request):
    try:
        data = await request.json()
        text = (data.get("input") or data.get("text") or "").strip()
        if not text:
            return web.Response(status=400, text="Missing input text")

        req_voice = str(data.get("voice", "jarvis")).lower().strip()
        prefer = str(data.get("prefer", "auto")).lower().strip()
        speed = float(data.get("speed", 1.0))
        speed = max(0.6, min(1.8, speed))

        cache_key = (text, req_voice, round(speed, 2))
        if len(text) <= 120 and cache_key in _TTS_CACHE:
            cached_bytes, cached_ct, cached_eng = _TTS_CACHE[cache_key]
            _TTS_CACHE.move_to_end(cache_key)
            return _build_audio_response(cached_bytes, cached_ct, f"{cached_eng}-Cache", req_voice)

        # 1. Automatic Telugu Language Detection (Unicode range 0C00-0C7F)
        if _is_telugu(text) or req_voice in ["telugu", "mohan", "te-in-mohanneural"]:
            t0 = time.perf_counter()
            audio_bytes = await generate_edge_async(text, "te-IN-MohanNeural")
            _record_stat("edge", (time.perf_counter() - t0) * 1000, len(audio_bytes) > 0)
            return _build_audio_response(audio_bytes, "audio/mpeg", "EdgeNeural-Telugu", "te-IN-MohanNeural")

        # 2. Intelligent routing: Kokoro-82M (fast & offline) -> Edge-TTS (online) -> Piper (offline fallback)
        if kokoro_available and kokoro_engine is not None and prefer != "edge":
            target_kokoro_voice = KOKORO_VOICE_MAP.get(req_voice, DEFAULT_KOKORO_VOICE)
            t0 = time.perf_counter()
            try:
                wav_bytes = await asyncio.to_thread(generate_kokoro_sync, text, target_kokoro_voice, speed)
                elapsed = (time.perf_counter() - t0) * 1000
                if wav_bytes and len(wav_bytes) > 100:
                    _record_stat("kokoro", elapsed, True)
                    if len(text) <= 120:
                        _TTS_CACHE[cache_key] = (wav_bytes, "audio/wav", "Kokoro-82M")
                        if len(_TTS_CACHE) > _TTS_CACHE_MAX:
                            _TTS_CACHE.popitem(last=False)
                    return _build_audio_response(wav_bytes, "audio/wav", "Kokoro-82M", target_kokoro_voice)
            except Exception as ke:
                _record_stat("kokoro", (time.perf_counter() - t0) * 1000, False)
                print(f"[Neural TTS Kokoro Error]: {ke}. Failing over...", file=sys.stderr, flush=True)

        # 3. High-Fidelity Edge-TTS Fallback (online)
        if prefer != "offline":
            target_edge_voice = EDGE_VOICE_MAP.get(req_voice, DEFAULT_EDGE_VOICE)
            t0 = time.perf_counter()
            try:
                audio_bytes = await generate_edge_async(text, target_edge_voice)
                elapsed = (time.perf_counter() - t0) * 1000
                if len(audio_bytes) > 0:
                    _record_stat("edge", elapsed, True)
                    if len(text) <= 120:
                        _TTS_CACHE[cache_key] = (audio_bytes, "audio/mpeg", "EdgeNeural-Fallback")
                        if len(_TTS_CACHE) > _TTS_CACHE_MAX:
                            _TTS_CACHE.popitem(last=False)
                    return _build_audio_response(audio_bytes, "audio/mpeg", "EdgeNeural-Fallback", target_edge_voice)
            except Exception as ee:
                _record_stat("edge", (time.perf_counter() - t0) * 1000, False)
                print(f"[Neural TTS Edge Error]: {ee}. Trying Piper offline fallback...", file=sys.stderr, flush=True)

        # 4. Offline Piper CLI Fallback
        t0 = time.perf_counter()
        piper_bytes = await asyncio.to_thread(generate_piper_sync, text)
        if piper_bytes and len(piper_bytes) > 100:
            _record_stat("piper", (time.perf_counter() - t0) * 1000, True)
            return _build_audio_response(piper_bytes, "audio/wav", "Piper-Offline", "piper")
        _record_stat("piper", (time.perf_counter() - t0) * 1000, False)
        return web.Response(status=500, text="All TTS engines failed to produce audio")
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
        "cache_entries": len(_TTS_CACHE),
        "engine_stats": _ENGINE_STATS,
        "voices": kokoro_engine.get_voices() if (kokoro_available and kokoro_engine is not None) else list(EDGE_VOICE_MAP.keys())
    }, headers={"Access-Control-Allow-Origin": "*"})

async def handle_speech_stream(request):
    """Streaming TTS endpoint yielding audio chunks in real time."""
    try:
        data = await request.json()
        text = str(data.get("input", data.get("text", ""))).strip()
        if not text:
            return web.Response(status=400, text="Missing input text")
        voice_req = str(data.get("voice", "am_adam")).lower()
        target_kokoro_voice = KOKORO_VOICE_MAP.get(voice_req, DEFAULT_KOKORO_VOICE)
        target_edge_voice = EDGE_VOICE_MAP.get(voice_req, DEFAULT_EDGE_VOICE)

        resp = web.StreamResponse(
            status=200,
            headers={
                "Content-Type": "audio/mpeg" if not kokoro_available else "audio/wav",
                "Access-Control-Allow-Origin": "*",
            },
        )
        await resp.prepare(request)

        if kokoro_available and kokoro_engine is not None and not _is_telugu(text):
            if hasattr(kokoro_engine, "create_stream"):
                async for samples, sample_rate in kokoro_engine.create_stream(
                    text, voice=target_kokoro_voice, speed=1.0, lang="en-us"
                ):
                    buf = io.BytesIO()
                    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
                    await resp.write(buf.getvalue())
            else:
                samples, sample_rate = kokoro_engine.create(text, voice=target_kokoro_voice, speed=1.0, lang="en-us")
                buf = io.BytesIO()
                sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
                await resp.write(buf.getvalue())
        else:
            communicate = edge_tts.Communicate(text, target_edge_voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    await resp.write(chunk["data"])

        await resp.write_eof()
        return resp
    except Exception as e:
        return web.Response(status=500, text=str(e), headers={"Access-Control-Allow-Origin": "*"})


app = web.Application()
app.router.add_post("/v1/audio/speech", handle_speech)
app.router.add_post("/tts/stream", handle_speech_stream)
app.router.add_options("/v1/audio/speech", handle_options)
app.router.add_options("/tts/stream", handle_options)
app.router.add_get("/health", handle_health)
app.router.add_get("/", handle_health)

if __name__ == "__main__":
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    print(f"[Neural TTS] Starting JARVIS Speech Matrix (Kokoro-82M + Edge-TTS) on http://127.0.0.1:{port}...", flush=True)
    web.run_app(app, host="127.0.0.1", port=port, print=None)
