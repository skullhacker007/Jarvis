import unittest
from unittest.mock import patch, MagicMock
from tools.web_search import WebSearchTool


class TestTools(unittest.TestCase):
    def test_web_search_initialization(self):
        tool = WebSearchTool()
        self.assertIsNotNone(tool)

    @patch("requests.get")
    def test_duckduckgo_fallback(self, mock_requests_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = """
        <div class="result__body">
            <h2><a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FQuantum_computing">Quantum Computing</a></h2>
            <a class="result__snippet">Quantum computing is a type of computation.</a>
        </div>
        """
        mock_requests_get.return_value = mock_resp

        tool = WebSearchTool()
        result = tool._duckduckgo_search("quantum computing")
        self.assertIn("Quantum Computing", result)
        self.assertIn("https://en.wikipedia.org/wiki/Quantum_computing", result)


if __name__ == "__main__":
    unittest.main()
