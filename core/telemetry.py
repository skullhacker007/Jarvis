import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NAVI_Telemetry")

class PipelineTelemetry:
    """
    Measures end-to-end latency across every stage of the conversational turn:
    User Speech End -> STT Finalized -> LLM TTFT (Time to First Token) -> TTS TTFA (Time to First Audio).
    """

    def __init__(self):
        self.t_speech_end = 0.0
        self.t_stt_finalized = 0.0
        self.t_first_token = 0.0
        self.t_first_audio = 0.0

    def mark_speech_end(self):
        self.t_speech_end = time.perf_counter()

    def mark_stt_finalized(self):
        self.t_stt_finalized = time.perf_counter()

    def mark_first_token(self):
        self.t_first_token = time.perf_counter()

    def mark_first_audio(self):
        self.t_first_audio = time.perf_counter()
        self.log_metrics()

    def log_metrics(self):
        stt_latency = (self.t_stt_finalized - self.t_speech_end) * 1000 if self.t_stt_finalized and self.t_speech_end else 0
        llm_ttft = (self.t_first_token - self.t_stt_finalized) * 1000 if self.t_first_token and self.t_stt_finalized else 0
        tts_ttfa = (self.t_first_audio - self.t_first_token) * 1000 if self.t_first_audio and self.t_first_token else 0
        total_e2e = (self.t_first_audio - self.t_speech_end) * 1000 if self.t_first_audio and self.t_speech_end else 0

        logger.info(
            f"\n[LATENCY REPORT]\n"
            f" ├─ STT Latency:    {stt_latency:6.1f} ms\n"
            f" ├─ LLM TTFT:       {llm_ttft:6.1f} ms\n"
            f" ├─ TTS TTFA:       {tts_ttfa:6.1f} ms\n"
            f" └─ Total End-to-End: {total_e2e:6.1f} ms"
        )
