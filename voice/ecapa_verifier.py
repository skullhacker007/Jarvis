import os
import logging
import numpy as np
import torch

logger = logging.getLogger("JARVIS_ECAPA")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "ecapa_tdnn")
EMBEDDING_PATH = os.path.join(PROJECT_ROOT, "data", "owner_ecapa_embedding.npy")


class EcapaSpeakerVerifier:
    """
    ECAPA-TDNN Speaker Verification powered by SpeechBrain (spkrec-ecapa-voxceleb).
    Replaces heuristic pitch/RMS voiceprint checks with 192-d speaker embeddings.
    """

    def __init__(self, threshold: float = 0.28):
        self.threshold = threshold
        self._classifier = None
        self._owner_emb = None
        self._load_owner_embedding()

    def _ensure_model(self):
        if self._classifier is not None:
            return
        from speechbrain.inference.speaker import EncoderClassifier

        os.makedirs(MODEL_DIR, exist_ok=True)
        logger.info("Loading ECAPA-TDNN speaker verification model...")
        self._classifier = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=MODEL_DIR,
            run_opts={"device": "cpu"},
        )
        logger.info("ECAPA-TDNN model ready.")

    def _load_owner_embedding(self):
        if os.path.exists(EMBEDDING_PATH):
            try:
                emb = np.load(EMBEDDING_PATH)
                norm = np.linalg.norm(emb)
                if norm > 0:
                    self._owner_emb = emb / norm
                    logger.info("Loaded enrolled owner ECAPA-TDNN voiceprint.")
            except Exception as e:
                logger.warning(f"Failed to load owner embedding: {e}")

    @staticmethod
    def _to_tensor(audio_data: np.ndarray) -> torch.Tensor:
        arr = np.asarray(audio_data)
        if arr.dtype == np.int16:
            arr = arr.astype(np.float32) / 32768.0
        else:
            arr = arr.astype(np.float32)
        if arr.ndim > 1:
            arr = arr.mean(axis=1)
        return torch.from_numpy(arr).unsqueeze(0)

    def extract_embedding(self, audio_data: np.ndarray) -> np.ndarray:
        self._ensure_model()
        wav_tensor = self._to_tensor(audio_data)
        with torch.no_grad():
            emb = self._classifier.encode_batch(wav_tensor)
        vec = emb.squeeze().cpu().numpy().astype(np.float32)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def enroll(self, audio_data: np.ndarray) -> tuple[bool, str]:
        if len(audio_data) < 16000:
            return False, "Audio too short for ECAPA-TDNN enrollment (need >= 1s)."
        vec = self.extract_embedding(audio_data)
        os.makedirs(os.path.dirname(EMBEDDING_PATH), exist_ok=True)
        np.save(EMBEDDING_PATH, vec)
        self._owner_emb = vec
        return True, "Owner ECAPA-TDNN voiceprint enrolled successfully."

    def verify(self, audio_data: np.ndarray) -> tuple[bool, float, str]:
        if self._owner_emb is None:
            return True, 1.0, "ECAPA-TDNN: No owner voiceprint enrolled yet (open access)."
        if len(audio_data) < 4800:
            return False, 0.0, "ECAPA-TDNN: Speech segment too short for verification."
        vec = self.extract_embedding(audio_data)
        score = float(np.dot(vec, self._owner_emb))
        is_match = score >= self.threshold
        conf_pct = round(max(0.0, min(100.0, (score + 1.0) * 50.0)), 1)
        if is_match:
            return True, conf_pct, f"AUTHENTICATED: ECAPA-TDNN match ({conf_pct}%)"
        return False, conf_pct, f"ACCESS DENIED: ECAPA-TDNN mismatch ({conf_pct}%)"

    def verify_with_antispoof(self, audio_data: np.ndarray) -> dict:
        """Runs ECAPA-TDNN speaker verification combined with SpeechBrain-compatible anti-spoofing."""
        verified, conf, msg = self.verify(audio_data)
        is_live, spoof_score, spoof_msg = AntiSpoofDetector.check_liveness(audio_data)
        if not is_live:
            verified = False
            msg = f"SPOOF BLOCKED: {spoof_msg}"
        return {
            "verified": verified,
            "confidence": conf,
            "is_live": is_live,
            "spoof_score": spoof_score,
            "message": msg,
        }


class AntiSpoofDetector:
    """
    SpeechBrain-compatible Speaker Anti-Spoofing detector.
    Uses a local SpeechBrain anti-spoofing classifier if installed in `models/antispoof`,
    with a real-time spectral flatness & harmonic liveness analyzer for replay/TTS detection.
    """

    _sb_model = None
    _sb_checked = False

    @classmethod
    def _try_load_speechbrain_antispoof(cls):
        if cls._sb_checked:
            return cls._sb_model
        cls._sb_checked = True
        antispoof_dir = os.path.join(PROJECT_ROOT, "models", "antispoof")
        if os.path.isdir(antispoof_dir) and os.listdir(antispoof_dir):
            try:
                from speechbrain.inference.classifiers import EncoderClassifier
                cls._sb_model = EncoderClassifier.from_hparams(
                    source=antispoof_dir,
                    savedir=antispoof_dir,
                    run_opts={"device": "cpu"},
                )
            except Exception as e:
                logger.warning(f"SpeechBrain local antispoof load notice: {e}")
        return cls._sb_model

    @classmethod
    def check_liveness(cls, audio_data: np.ndarray, sample_rate: int = 16000) -> tuple[bool, float, str]:
        arr = np.asarray(audio_data)
        if arr.size < 3200:
            return True, 0.95, "Segment too short for spoof rejection"
        f32 = arr.astype(np.float32) / 32768.0 if arr.dtype == np.int16 else arr.astype(np.float32)
        if f32.ndim > 1:
            f32 = f32.mean(axis=1)

        # Optional SpeechBrain local anti-spoofing model
        sb = cls._try_load_speechbrain_antispoof()
        if sb is not None:
            try:
                with torch.no_grad():
                    out = sb.classify_batch(torch.from_numpy(f32).unsqueeze(0))
                    score = float(torch.softmax(out[0], dim=-1).max().item())
                    pred = str(out[3][0]).lower() if len(out) > 3 else ""
                    is_live = "spoof" not in pred
                    return is_live, round(score, 3), f"SpeechBrain anti-spoof ({pred or 'bonafide'})"
            except Exception:
                pass

        # Spectral flatness & sub-band energy ratio liveness check
        mag = np.abs(np.fft.rfft(f32)) + 1e-9
        freqs = np.fft.rfftfreq(len(f32), d=1.0 / sample_rate)
        low_band = float(np.mean(mag[(freqs >= 80) & (freqs <= 3500)]))
        high_band = float(np.mean(mag[(freqs > 3500) & (freqs <= 7800)]))
        geo_mean = float(np.exp(np.mean(np.log(mag))))
        arith_mean = float(np.mean(mag))
        flatness = geo_mean / arith_mean
        ratio = high_band / (low_band + 1e-9)

        # Live human speech has rich low-band harmonics (ratio < 0.85) and non-white flatness (< 0.55)
        liveness_score = max(0.0, min(1.0, 1.0 - (flatness * 0.6 + max(0.0, ratio - 0.5) * 0.5)))
        is_live = liveness_score >= 0.35
        reason = "Live voice verified" if is_live else "Synthetic/replay spectral signature detected"
        return is_live, round(liveness_score, 3), reason
