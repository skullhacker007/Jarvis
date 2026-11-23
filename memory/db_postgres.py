import logging
from config import Config

logger = logging.getLogger("NAVI_DB")

class PostgresManager:
    """
    Manages connection to PostgreSQL on OCI with pgvector enabled.
    Stores relational user memory, embeddings, documents, and citations.
    """

    def __init__(self):
        self.conn = None

    def get_connection(self):
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            if self.conn is None or self.conn.closed:
                self.conn = psycopg2.connect(
                    host=Config.PG_HOST,
                    port=Config.PG_PORT,
                    database=Config.PG_DATABASE,
                    user=Config.PG_USER,
                    password=Config.PG_PASSWORD,
                    connect_timeout=5
                )
            return self.conn
        except ImportError:
            logger.info("psycopg2 not installed. Operating in offline buffer mode.")
            return None
        except Exception as e:
            logger.warning(f"Could not connect to PostgreSQL on OCI ({e}). Running in offline buffer mode.")
            return None

    def initialize_schema(self):
        """Initializes tables for pgvector, memories, and citations."""
        conn = self.get_connection()
        if not conn:
            logger.warning("Skipping schema initialization: DB connection offline.")
            return False

        try:
            with conn.cursor() as cur:
                # 1. Enable pgvector extension
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

                # 2. Long-term memory table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_memories (
                        id SERIAL PRIMARY KEY,
                        category VARCHAR(50),
                        content TEXT NOT NULL,
                        embedding vector(1536),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # 3. Document chunks & RAG citations table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS rag_documents (
                        id SERIAL PRIMARY KEY,
                        source_file VARCHAR(255) NOT NULL,
                        page_number INT,
                        chunk_text TEXT NOT NULL,
                        embedding vector(1536),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # 4. Conversation logs & debate records
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_logs (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(100),
                        role VARCHAR(20) NOT NULL,
                        content TEXT NOT NULL,
                        latency_ms FLOAT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                conn.commit()
                logger.info("PostgreSQL + pgvector schema successfully verified/initialized.")
                return True
        except Exception as e:
            logger.error(f"Failed to initialize schema ({e}). Resetting DB connection.")
            self.conn = None
            return False
