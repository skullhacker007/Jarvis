import json
import time
import logging
import urllib.request
import urllib.error
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NAVI_Telemetry")

class PipelineTelemetry:
    """
    Measures end-to-end latency across every stage of the conversational turn:
    Speech Endpoint -> STT Finalized -> LLM TTFT -> LLM Complete -> TTS TTFA -> Total E2E.
    """

    def __init__(self):
        self.t_endpoint_detected = 0.0
        self.t_speech_end = 0.0
        self.t_stt_finalized = 0.0
        self.t_first_token = 0.0
        self.t_llm_complete = 0.0
        self.t_first_audio = 0.0

    def mark_endpoint_detected(self):
        self.t_endpoint_detected = time.perf_counter()
        self.t_speech_end = self.t_endpoint_detected

    def mark_speech_end(self):
        self.t_speech_end = time.perf_counter()

    def mark_stt_finalized(self):
        self.t_stt_finalized = time.perf_counter()

    def mark_first_token(self):
        self.t_first_token = time.perf_counter()

    def mark_llm_complete(self):
        self.t_llm_complete = time.perf_counter()

    def mark_first_audio(self):
        self.t_first_audio = time.perf_counter()
        self.log_metrics()

    def to_dict(self) -> Dict[str, float]:
        stt_ms = (self.t_stt_finalized - self.t_speech_end) * 1000 if self.t_stt_finalized and self.t_speech_end else 0.0
        ttft_ms = (self.t_first_token - self.t_stt_finalized) * 1000 if self.t_first_token and self.t_stt_finalized else 0.0
        llm_total_ms = (self.t_llm_complete - self.t_stt_finalized) * 1000 if self.t_llm_complete and self.t_stt_finalized else 0.0
        ttfa_ms = (self.t_first_audio - self.t_first_token) * 1000 if self.t_first_audio and self.t_first_token else 0.0
        e2e_ms = (self.t_first_audio - self.t_speech_end) * 1000 if self.t_first_audio and self.t_speech_end else 0.0
        return {
            "stt_ms": round(stt_ms, 1),
            "llm_ttft_ms": round(ttft_ms, 1),
            "llm_complete_ms": round(llm_total_ms, 1),
            "tts_ttfa_ms": round(ttfa_ms, 1),
            "total_e2e_ms": round(e2e_ms, 1),
        }

    def log_metrics(self):
        m = self.to_dict()
        logger.info(
            f"\n[LATENCY REPORT]\n"
            f" ├─ STT Latency:      {m['stt_ms']:6.1f} ms\n"
            f" ├─ LLM TTFT:         {m['llm_ttft_ms']:6.1f} ms\n"
            f" ├─ LLM Complete:     {m['llm_complete_ms']:6.1f} ms\n"
            f" ├─ TTS TTFA:         {m['tts_ttfa_ms']:6.1f} ms\n"
            f" └─ Total End-to-End: {m['total_e2e_ms']:6.1f} ms"
        )


class ComponentDiagnostics:
    """Probes core JARVIS services and generates automatic remediation diagnostics."""

    ENDPOINTS = {
        "neural_tts": ("http://127.0.0.1:5000/health", "Check scripts/neural_tts_service.py or port 5000."),
        "pipecat_voice": ("http://127.0.0.1:5007/health", "Check voice/pipecat_voice_agent.py and mic device."),
        "ai_router": ("http://127.0.0.1:5008/health", "Check core/llm_client.py --serve 5008."),
        "ollama": ("http://127.0.0.1:11434/api/tags", "Start Ollama service (ollama serve) for offline LLM."),
    }

    @classmethod
    def run_check(cls, timeout_sec: float = 1.2) -> Dict[str, Any]:
        report: Dict[str, Any] = {"components": {}, "healthy_count": 0, "total": len(cls.ENDPOINTS)}
        for name, (url, hint) in cls.ENDPOINTS.items():
            t0 = time.perf_counter()
            try:
                with urllib.request.urlopen(url, timeout=timeout_sec) as resp:
                    body = resp.read().decode("utf-8", errors="replace")
                    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
                    parsed = None
                    try:
                        parsed = json.loads(body)
                    except Exception:
                        pass
                    report["components"][name] = {
                        "status": "healthy" if resp.status == 200 else "degraded",
                        "http_status": resp.status,
                        "latency_ms": latency_ms,
                        "details": parsed,
                    }
                    if resp.status == 200:
                        report["healthy_count"] += 1
            except Exception as e:
                report["components"][name] = {
                    "status": "unreachable",
                    "error": str(e),
                    "remediation": hint,
                }
        return report

    @classmethod
    def diagnose_and_recover(
        cls,
        recovery_hooks: Dict[str, Any] = None,
        endpoints: Dict[str, tuple] = None,
        timeout_sec: float = 1.2,
        settle_sec: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Runs fault detection across endpoints, invokes recovery_hooks[name]() for any
        unhealthy/unreachable component, and re-probes to verify recovery.
        """
        target_map = endpoints if endpoints is not None else cls.ENDPOINTS
        hooks = recovery_hooks or {}
        report: Dict[str, Any] = {"components": {}, "healthy_count": 0, "recovered": [], "total": len(target_map)}

        for name, (url, hint) in target_map.items():
            status, details_or_err = cls._probe_once(url, timeout_sec)
            if status == "healthy":
                report["components"][name] = {"status": "healthy", "details": details_or_err}
                report["healthy_count"] += 1
                continue

            entry: Dict[str, Any] = {
                "status": status,
                "error": details_or_err,
                "remediation": hint,
                "recovery_attempted": False,
                "recovered": False,
            }
            if name in hooks and callable(hooks[name]):
                entry["recovery_attempted"] = True
                try:
                    hooks[name]()
                    time.sleep(settle_sec)
                    new_status, new_info = cls._probe_once(url, timeout_sec)
                    if new_status == "healthy":
                        entry["status"] = "healthy"
                        entry["recovered"] = True
                        entry["details"] = new_info
                        report["healthy_count"] += 1
                        report["recovered"].append(name)
                    else:
                        entry["post_recovery_error"] = new_info
                except Exception as rec_err:
                    entry["recovery_error"] = str(rec_err)
            report["components"][name] = entry
        return report

    @staticmethod
    def _probe_once(url: str, timeout_sec: float) -> tuple[str, Any]:
        try:
            with urllib.request.urlopen(url, timeout=timeout_sec) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                try:
                    parsed = json.loads(body)
                except Exception:
                    parsed = body
                return ("healthy" if resp.status == 200 else "degraded"), parsed
        except Exception as e:
            return "unreachable", str(e)
