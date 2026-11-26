import os
import shutil
import socket
import subprocess
from pathlib import Path
from typing import Dict, Any


class DevTools:
    """
    Developer productivity & diagnostics toolkit for JARVIS:
    - Git status & diff inspection
    - Project .venv / uv / Node / Cargo environment health checks
    - Local service port checks (5000 TTS, 5006 Playwright, 5007 Pipecat, 5008 LLM)
    - Automated test execution
    """

    def __init__(self, project_root: str | Path | None = None):
        self.root = Path(project_root) if project_root else Path(__file__).resolve().parent.parent

    def _run(self, cmd: list[str], timeout: int = 30) -> Dict[str, Any]:
        try:
            proc = subprocess.run(
                cmd,
                cwd=str(self.root),
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            return {
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
            }
        except Exception as e:
            return {"ok": False, "returncode": -1, "stdout": "", "stderr": str(e)}

    def git_status(self) -> Dict[str, Any]:
        return self._run(["git", "status", "-sb"])

    def git_diff_stat(self) -> Dict[str, Any]:
        return self._run(["git", "diff", "--stat"])

    def check_port(self, port: int, host: str = "127.0.0.1") -> bool:
        try:
            with socket.create_connection((host, port), timeout=0.4):
                return True
        except Exception:
            return False

    def env_doctor(self) -> Dict[str, Any]:
        venv_py = self.root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        return {
            "venv_exists": venv_py.exists(),
            "venv_python": str(venv_py),
            "uv_available": shutil.which("uv") is not None,
            "node_available": shutil.which("node") is not None,
            "cargo_available": shutil.which("cargo") is not None,
            "git_available": shutil.which("git") is not None,
            "services": {
                "tts_5000": self.check_port(5000),
                "playwright_5006": self.check_port(5006),
                "pipecat_5007": self.check_port(5007),
                "llm_router_5008": self.check_port(5008),
            },
        }

    def run_python_tests(self) -> Dict[str, Any]:
        venv_py = self.root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        py = str(venv_py) if venv_py.exists() else "python"
        return self._run([py, "-m", "unittest", "discover", "-s", "tests", "-v"], timeout=60)
