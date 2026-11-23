import logging
import subprocess
from pathlib import Path
from config import Config

logger = logging.getLogger("NAVI_PiperTTS")

class PiperTTSFallback:
    """
    Local offline neural TTS using Piper.
    Invoked when Cartesia Sonic is unreachable, ensuring NAVI can still speak.
    """

    def __init__(self, model_path: str = None):
        self.model_path = Path(model_path or Config.PIPER_MODEL_PATH)

    def synthesize_to_file(self, text: str, output_wav_path: str) -> bool:
        """Runs local piper executable or python module to render speech."""
        if not self.model_path.exists():
            logger.warning(f"Piper ONNX model not found at {self.model_path}. Please download voice model.")
            return False

        try:
            # Piper CLI call: echo text | piper --model model.onnx --output_file out.wav
            cmd = ["piper", "--model", str(self.model_path), "--output_file", output_wav_path]
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            _, stderr = process.communicate(input=text.encode("utf-8"))

            if process.returncode == 0:
                return True
            else:
                logger.error(f"Piper synthesis error: {stderr.decode('utf-8')}")
                return False
        except Exception as e:
            logger.error(f"Failed to run Piper TTS: {e}")
            return False
