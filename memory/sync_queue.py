import json
import logging
from config import Config
from memory.db_postgres import PostgresManager

logger = logging.getLogger("NAVI_SyncQueue")

class OfflineSyncQueue:
    """
    Maintains a local write-ahead log for memories and turns when offline.
    Features:
    - Dead-letter queue routing for poison pills (retries >= 3)
    - Conflict resolution and deduplication against database state
    - Clean queue flushing upon network reconnection
    """

    def __init__(self, db_manager: PostgresManager):
        self.db_manager = db_manager
        self.queue_path = Config.OFFLINE_QUEUE_FILE
        self.dead_letter_path = Config.CACHE_DIR / "dead_letter_queue.jsonl"
        self.queue_path.parent.mkdir(parents=True, exist_ok=True)

    def push_offline_record(self, record_type: str, data: dict):
        """Appends a new record to the local JSONL buffer with retry metadata."""
        payload = {
            "type": record_type,
            "data": data,
            "retries": 0,
            "created_at": data.get("timestamp") or data.get("created_at") or 0
        }
        with open(self.queue_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
        logger.info(f"Buffered {record_type} to local offline queue.")

    def sync_to_cloud(self):
        """Flushes the local offline queue into PostgreSQL with dead-letter isolation."""
        if not self.queue_path.exists() or self.queue_path.stat().st_size == 0:
            return

        conn = self.db_manager.get_connection()
        if not conn:
            logger.info("Cloud database still unreachable. Preserving offline queue.")
            return

        logger.info("Cloud connection detected. Syncing offline queue to PostgreSQL...")
        remaining_lines = []
        dead_letter_records = []

        try:
            with open(self.queue_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            with conn.cursor() as cur:
                for line in lines:
                    raw = line.strip()
                    if not raw:
                        continue
                    try:
                        record = json.loads(raw)
                        rec_type = record.get("type")
                        data = record.get("data", {})
                        retries = int(record.get("retries", 0))

                        # Dead-letter routing if repeated failure threshold exceeded
                        if retries >= 3:
                            record["dead_letter_reason"] = "Exceeded max retry threshold (3)"
                            dead_letter_records.append(record)
                            continue

                        if rec_type == "memory":
                            content = data.get("content", "").strip()
                            category = data.get("category", "general").strip()
                            # Idempotent deduplication check
                            cur.execute(
                                "SELECT id FROM user_memories WHERE content = %s LIMIT 1;",
                                (content,)
                            )
                            if not cur.fetchone():
                                cur.execute(
                                    "INSERT INTO user_memories (category, content) VALUES (%s, %s);",
                                    (category, content)
                                )
                        elif rec_type == "conversation":
                            cur.execute(
                                "INSERT INTO conversation_logs (session_id, role, content, latency_ms) VALUES (%s, %s, %s, %s);",
                                (data.get("session_id"), data.get("role"), data.get("content"), data.get("latency_ms"))
                            )
                    except Exception as err:
                        logger.error(f"Error replaying record ({err}). Incrementing retry counter.")
                        try:
                            record = json.loads(raw)
                            record["retries"] = int(record.get("retries", 0)) + 1
                            remaining_lines.append(json.dumps(record) + "\n")
                        except Exception:
                            remaining_lines.append(line)

                conn.commit()

            # Write dead-letter records if any poison records were isolated
            if dead_letter_records:
                with open(self.dead_letter_path, "a", encoding="utf-8") as dlf:
                    for dlr in dead_letter_records:
                        dlf.write(json.dumps(dlr) + "\n")
                logger.warning(f"Routed {len(dead_letter_records)} unrecoverable records to dead-letter queue.")

            # Overwrite queue with only the failed lines (if any)
            with open(self.queue_path, "w", encoding="utf-8") as f:
                f.writelines(remaining_lines)

            logger.info("Offline queue synchronization cycle completed.")
        except Exception as e:
            logger.error(f"Failed to sync offline queue: {e}")
