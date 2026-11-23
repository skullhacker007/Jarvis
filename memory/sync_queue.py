import json
import logging
from config import Config
from memory.db_postgres import PostgresManager

logger = logging.getLogger("NAVI_SyncQueue")

class OfflineSyncQueue:
    """
    Maintains a local write-ahead log for memories and turns when offline.
    Automatically syncs records to PostgreSQL once the cloud connection is restored.
    """

    def __init__(self, db_manager: PostgresManager):
        self.db_manager = db_manager
        self.queue_path = Config.OFFLINE_QUEUE_FILE

    def push_offline_record(self, record_type: str, data: dict):
        """Appends a new record to the local JSONL buffer."""
        payload = {"type": record_type, "data": data}
        with open(self.queue_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
        logger.info(f"Buffered {record_type} to local offline queue.")

    def sync_to_cloud(self):
        """Flushes the local offline queue into PostgreSQL if connected."""
        if not self.queue_path.exists() or self.queue_path.stat().st_size == 0:
            return

        conn = self.db_manager.get_connection()
        if not conn:
            logger.info("Cloud database still unreachable. Preserving offline queue.")
            return

        logger.info("Cloud connection detected. Syncing offline queue to PostgreSQL...")
        remaining_lines = []

        try:
            with open(self.queue_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            with conn.cursor() as cur:
                for line in lines:
                    try:
                        record = json.loads(line.strip())
                        rec_type = record.get("type")
                        data = record.get("data", {})

                        if rec_type == "memory":
                            cur.execute(
                                "INSERT INTO user_memories (category, content) VALUES (%s, %s);",
                                (data.get("category", "general"), data.get("content"))
                            )
                        elif rec_type == "conversation":
                            cur.execute(
                                "INSERT INTO conversation_logs (session_id, role, content, latency_ms) VALUES (%s, %s, %s, %s);",
                                (data.get("session_id"), data.get("role"), data.get("content"), data.get("latency_ms"))
                            )
                    except Exception as err:
                        logger.error(f"Error replaying record ({err}), keeping in queue.")
                        remaining_lines.append(line)

                conn.commit()

            # Overwrite queue with only the failed lines (if any)
            with open(self.queue_path, "w", encoding="utf-8") as f:
                f.writelines(remaining_lines)

            logger.info("Offline queue synchronization completed.")
        except Exception as e:
            logger.error(f"Failed to sync offline queue: {e}")
