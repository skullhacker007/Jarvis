import unittest
from unittest.mock import patch, MagicMock
from tools.web_search import WebSearchTool


class TestTools(unittest.TestCase):
    def test_web_search_initialization(self):
        tool = WebSearchTool()
        self.assertIsNotNone(tool)

    def test_duckduckgo_fallback(self):
        sample_html = """
        <div class="result__body">
            <h2><a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FQuantum_computing">Quantum Computing</a></h2>
            <a class="result__snippet">Quantum computing is a type of computation.</a>
        </div>
        """
        tool = WebSearchTool()
        with patch("urllib.request.urlopen") as mock_urlopen, patch.dict("sys.modules", {"duckduckgo_search": None}):
            mock_resp = MagicMock()
            mock_resp.read.return_value = sample_html.encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp
            result = tool._duckduckgo_search("quantum computing")
            self.assertIn("Quantum Computing", result)
            self.assertIn("https://en.wikipedia.org/wiki/Quantum_computing", result)

    def test_dev_tools_env_doctor(self):
        from tools.dev_tools import DevTools
        dt = DevTools()
        doc = dt.env_doctor()
        self.assertTrue(doc["venv_exists"])
        self.assertTrue(doc["git_available"])
        gs = dt.git_status()
        self.assertTrue(gs["ok"])

    def test_dev_skills_loaded(self):
        from core.skills_registry import SkillsRegistry
        reg = SkillsRegistry(skills_dir="skills")
        for sid in ("developer_workspace", "git_status_check", "run_tests_suite", "build_jarvis_exe", "dev_terminal"):
            self.assertIn(sid, reg.skills)


if __name__ == "__main__":
    unittest.main()
