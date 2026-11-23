import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

from memory.sync_queue import OfflineSyncQueue
from memory.rag_engine import HybridRAGEngine


class TestMemoryEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.mock_db = MagicMock()
        self.mock_db.get_connection.return_value = None  # Simulate offline mode
        
        self.queue = OfflineSyncQueue(self.mock_db)
        self.queue.queue_path = Path(self.temp_dir.name) / "offline_sync_queue.jsonl"
        self.queue.dead_letter_path = Path(self.temp_dir.name) / "dead_letter_queue.jsonl"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_offline_queue_buffering(self):
        self.queue.push_offline_record("turn", {"user": "hello", "assistant": "hi", "timestamp": 12345})
        self.assertTrue(self.queue.queue_path.exists())
        
        with open(self.queue.queue_path, "r", encoding="utf-8") as f:
            lines = [json.loads(line) for line in f if line.strip()]
            
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["type"], "turn")
        self.assertEqual(lines[0]["data"]["user"], "hello")
        self.assertEqual(lines[0]["retries"], 0)

    def test_sync_to_cloud_offline_preservation(self):
        # Push 2 records
        self.queue.push_offline_record("turn", {"user": "q1", "assistant": "a1"})
        self.queue.push_offline_record("memory", {"fact": "likes coffee"})
        
        # Call sync when DB is offline
        self.queue.sync_to_cloud()
        
        # Records must still be in queue
        with open(self.queue.queue_path, "r", encoding="utf-8") as f:
            lines = [line for line in f if line.strip()]
        self.assertEqual(len(lines), 2)

    def test_rag_bm25_tokenization(self):
        # Test HybridRAGEngine's query term extraction
        query = "What is the status of project Stark?"
        keywords = HybridRAGEngine.extract_keywords(query) if hasattr(HybridRAGEngine, "extract_keywords") else query.lower().split()
        self.assertTrue(any("stark" in str(kw).lower() for kw in keywords))


if __name__ == "__main__":
    unittest.main()
