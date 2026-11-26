import os
from pathlib import Path

# Load .env / .env.local file
BASE_DIR = Path(__file__).resolve().parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env.local")
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    # Native lightweight fallback loader when python-dotenv is not installed
    for env_file in [BASE_DIR / ".env.local", BASE_DIR / ".env"]:
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            clean_k = k.strip()
                            clean_v = v.strip().strip("'\"")
                            os.environ.setdefault(clean_k, clean_v)
                            os.environ.setdefault(clean_k.upper(), clean_v)
            except Exception:
                pass

# Windows DPAPI Encrypted Vault Loader
def _load_dpapi_vault():
    if os.name != "nt":
        return
    for candidate in [BASE_DIR / "data" / "vault.enc", BASE_DIR / "src-tauri" / "data" / "vault.enc"]:
        if candidate.exists():
            try:
                import ctypes
                from ctypes import wintypes
                import json

                class DATA_BLOB(ctypes.Structure):
                    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]

                crypt32 = ctypes.windll.crypt32
                kernel32 = ctypes.windll.kernel32
                encrypted = candidate.read_bytes()
                in_blob = DATA_BLOB(len(encrypted), ctypes.cast(ctypes.create_string_buffer(encrypted), ctypes.POINTER(ctypes.c_char)))
                out_blob = DATA_BLOB()
                if crypt32.CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 1, ctypes.byref(out_blob)):
                    decrypted = ctypes.string_at(out_blob.pbData, out_blob.cbData)
                    kernel32.LocalFree(out_blob.pbData)
                    secrets = json.loads(decrypted.decode("utf-8"))
                    for k, v in secrets.items():
                        os.environ.setdefault(k, str(v))
            except Exception:
                pass

_load_dpapi_vault()

class Config:
    # LiveKit
    LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", os.getenv("LiveKit_API_KEY", ""))
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
    LIVEKIT_TOKEN = os.getenv("LIVEKIT_TOKEN", os.getenv("LiveKit_API_KEY", ""))

    # Core LLM - Groq LPU (Primary)
    AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

    # Optional NVIDIA NIM API
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")

    # Secondary Cloud LLM Backup (Gemini Flash)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    # Deepgram & Cartesia
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
    CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "")
    CARTESIA_VOICE_ID = os.getenv("CARTESIA_VOICE_ID", "a0e99841-438c-4a64-b679-ae501e7d6091")

    # Tavily Search
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

    # PostgreSQL on OCI (Hyderabad)
    PG_HOST = os.getenv("PG_HOST", "localhost")
    PG_PORT = int(os.getenv("PG_PORT", 5432))
    PG_DATABASE = os.getenv("PG_DATABASE", "navi_db")
    PG_USER = os.getenv("PG_USER", "postgres")
    PG_PASSWORD = os.getenv("PG_PASSWORD", "")

    # Offline Fallback
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    PIPER_MODEL_PATH = os.getenv("PIPER_MODEL_PATH", str(BASE_DIR / "models" / "piper" / "en_US-lessac-medium.onnx"))

    # Local Cache / Buffers
    CACHE_DIR = BASE_DIR / "data" / "cache"
    OFFLINE_QUEUE_FILE = CACHE_DIR / "offline_sync_queue.jsonl"

Config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
