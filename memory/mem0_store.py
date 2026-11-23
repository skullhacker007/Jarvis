import logging
from config import Config

logger = logging.getLogger("NAVI_Mem0")

class Mem0MemoryStore:
    """
    Manages long-term user memory, preferences, and entity extraction
    using Mem0 with a PostgreSQL backend on OCI Hyderabad.
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
            self.memory = Memory.from_config(config)
            logger.info("Mem0 PostgreSQL vector memory initialized.")
        except Exception as e:
            logger.warning(f"Could not connect Mem0 to OCI PostgreSQL ({e}). Operating in memory buffer mode.")
            self.memory = None

    def add_memory(self, text: str, metadata: dict = None) -> bool:
        """Stores a new preference or factual memory."""
        if not self.memory:
            logger.info(f"Buffered memory note (offline): {text}")
            return False
        try:
            self.memory.add(text, user_id=self.user_id, metadata=metadata or {})
            return True
        except Exception as e:
            logger.error(f"Failed to write memory to Mem0: {e}")
            return False

    def search_memories(self, query: str, limit: int = 5) -> list:
        """Retrieves relevant facts and context for a query."""
        if not self.memory:
            return []
        try:
            results = self.memory.search(query, user_id=self.user_id, limit=limit)
            return results
        except Exception as e:
            logger.error(f"Mem0 search failed: {e}")
            return []
