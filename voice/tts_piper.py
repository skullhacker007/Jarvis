import logging
import subprocess
from pathlib import Path
from config import Config

logger = logging.getLogger("NAVI_PiperTTS")

class PiperTTSFallback:
    """
    Local offline neural TTS engine:
    1. Primary Local: Piper ONNX model if installed and model weights exist.
    2. Resilient Local Fallback: Local Kokoro-82M Studio Neural Service (http://127.0.0.1:5000)
       or direct Kokoro-ONNX synthesis.
    """

    def __init__(self, model_path: str = None):
        self.model_path = Path(model_path or Config.PIPER_MODEL_PATH)
        self.local_tts_url = "http://127.0.0.1:5000/v1/audio/speech"

    def synthesize_to_file(self, text: str, output_wav_path: str) -> bool:
        """Renders speech to a target WAV file with automatic offline fallback."""
        clean_text = (text or "").strip()
        if not clean_text:
            return False

        out_path = Path(output_wav_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # 1. Try local Piper executable if model exists
        if self.model_path.exists():
            try:
                cmd = ["piper", "--model", str(self.model_path), "--output_file", str(out_path)]
                process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                _, stderr = process.communicate(input=clean_text.encode("utf-8"), timeout=10)

                if process.returncode == 0 and out_path.exists() and out_path.stat().st_size > 100:
                    logger.info(f"Synthesized speech via Piper ONNX -> {out_path}")
                    return True
                else:
                    logger.warning(f"Piper execution notice: {stderr.decode('utf-8', errors='ignore')}")
            except Exception as e:
                logger.debug(f"Piper CLI not active ({e}). Routing to local Neural TTS service...")

        # 2. Resilient Local Fallback: JARVIS Kokoro-82M Neural Service on port 5000
        try:
            import requests
            resp = requests.post(
                self.local_tts_url,
                json={"input": clean_text, "voice": "jarvis", "speed": 1.0},
                timeout=8
            )
            if resp.status_code == 200 and len(resp.content) > 100:
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"Synthesized speech via local Neural TTS service (Kokoro/Edge) -> {out_path}")
                return True
        except Exception as e:
            logger.debug(f"Local Neural TTS service on port 5000 unreachable: {e}")

        # 3. Direct Kokoro-ONNX in-process synthesis fallback
        try:
            kokoro_model = Path(Config.BASE_DIR) / "models" / "kokoro" / "kokoro-v0_19.onnx"
            kokoro_voices = Path(Config.BASE_DIR) / "models" / "kokoro" / "voices.bin"
            if kokoro_model.exists() and kokoro_voices.exists():
                from kokoro_onnx import Kokoro
                import soundfile as sf
                engine = Kokoro(str(kokoro_model), str(kokoro_voices))
                samples, sample_rate = engine.create(clean_text, voice="am_adam", speed=1.0, lang="en-us")
                sf.write(str(out_path), samples, sample_rate, format="WAV")
                logger.info(f"Synthesized speech via in-process Kokoro-82M -> {out_path}")
                return True
        except Exception as e:
            logger.error(f"In-process Kokoro-82M synthesis error: {e}")

        logger.error(f"All offline TTS engines failed for text: '{clean_text[:40]}...'")
        return False
