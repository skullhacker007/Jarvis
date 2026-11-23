import logging
from config import Config

logger = logging.getLogger("NAVI_Mem0")

class Mem0MemoryStore:
    """
    Manages long-term user memory, preferences, and entity extraction
    using Mem0 with a PostgreSQL backend on OCI Hyderabad, backed by
    the local offline sync queue when disconnected.
    """

    def __init__(self, user_id: str = "default_user"):
        self.user_id = user_id
        self.memory = None
        self._init_client()

    def _init_client(self):
        try:
            from mem0 import Memory
            config = {
                "vector_store": {
                    "provider": "pgvector",
                    "config": {
                        "host": Config.PG_HOST,
                        "port": Config.PG_PORT,
                        "dbname": Config.PG_DATABASE,
                        "user": Config.PG_USER,
                        "password": Config.PG_PASSWORD,
                        "collection_name": "mem0_memories"
                    }
                }
            }

            # Configure LLM provider for Mem0 entity extraction without requiring OpenAI
            if Config.NVIDIA_API_KEY:
                config["llm"] = {
                    "provider": "openai",
                    "config": {
                        "model": Config.NVIDIA_MODEL,
                        "api_key": Config.NVIDIA_API_KEY,
                        "openai_base_url": Config.NVIDIA_BASE_URL,
                    }
                }
            elif Config.GEMINI_API_KEY:
                config["llm"] = {
                    "provider": "gemini",
                    "config": {
                        "model": Config.GEMINI_MODEL,
                        "api_key": Config.GEMINI_API_KEY,
                    }
                }
            else:
                config["llm"] = {
                    "provider": "ollama",
                    "config": {
                        "model": Config.OLLAMA_MODEL,
                        "ollama_base_url": Config.OLLAMA_BASE_URL,
                    }
                }

            # Configure embedder
            if Config.OLLAMA_BASE_URL:
                config["embedder"] = {
                    "provider": "ollama",
                    "config": {
                        "model": "nomic-embed-text",
                        "ollama_base_url": Config.OLLAMA_BASE_URL,
                    }
                }

            self.memory = Memory.from_config(config)
            logger.info("Mem0 PostgreSQL vector memory initialized with multi-provider reasoning.")
        except Exception as e:
            logger.warning(f"Could not connect Mem0 to OCI PostgreSQL ({e}). Operating in resilient buffer mode.")
            self.memory = None

    def add_memory(self, text: str, metadata: dict = None) -> bool:
        """Stores a new preference or factual memory, buffering to offline queue if disconnected."""
        clean = (text or "").strip()
        if not clean:
            return False

        meta = metadata or {}
        if not self.memory:
            self._buffer_offline("memory", {"category": meta.get("category", "general"), "content": clean})
            logger.info(f"Buffered memory note to offline queue: '{clean[:40]}...'")
            return True

        try:
            self.memory.add(clean, user_id=self.user_id, metadata=meta)
            return True
        except Exception as e:
            logger.error(f"Failed to write memory to Mem0 ({e}). Buffering offline.")
            self._buffer_offline("memory", {"category": meta.get("category", "general"), "content": clean})
            return True

    def search_memories(self, query: str, limit: int = 5) -> list:
        """Retrieves relevant facts and context for a query."""
        if not self.memory:
            return []
        try:
            results = self.memory.search(query, user_id=self.user_id, limit=limit)
            return results or []
        except Exception as e:
            logger.error(f"Mem0 search failed: {e}")
            return []

    def _buffer_offline(self, record_type: str, data: dict):
        try:
            from memory.sync_queue import OfflineSyncQueue
            from memory.db_postgres import PostgresManager
            queue = OfflineSyncQueue(PostgresManager())
            queue.push_offline_record(record_type, data)
        except Exception as err:
            logger.error(f"Failed to push offline memory buffer: {err}")
