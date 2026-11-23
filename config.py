import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

class Config:
    # LiveKit
    LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

    # LLM
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Deepgram & Cartesia
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
    CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "")
    CARTESIA_VOICE_ID = os.getenv("CARTESIA_VOICE_ID", "a0e99841-438c-4a64-b679-ae501e7d6091")  # Conversational Man/Woman

    # Tavily Search
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

    # PostgreSQL (OCI)
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
