import collections
import logging
import numpy as np

logger = logging.getLogger("JARVIS_AUDIO_ENHANCER")


class AudioEnhancer:
    """
    Real-time front-end audio enhancement pipeline:
    1. WebRTC-style Acoustic Echo Cancellation (pyaec / AEC)
    2. Neural Noise Suppression (pyrnnoise / RNNoise)
    Operates on 16 kHz mono int16 PCM frames.
    """

    def __init__(self, sample_rate: int = 16000, aec_frame_size: int = 160, aec_filter_len: int = 1600):
        self.sample_rate = sample_rate
        self.aec_frame_size = aec_frame_size
        self._aec = None
        self._rnnoise = None
        self._ref_queue: collections.deque[np.ndarray] = collections.deque(maxlen=200)

        try:
            from pyaec import Aec
            self._aec = Aec(aec_frame_size, aec_filter_len, sample_rate, enable_preprocess=True)
            logger.info("AEC3 (pyaec) initialized.")
        except Exception as e:
            logger.warning(f"AEC unavailable, bypassing: {e}")

        try:
            from pyrnnoise import RNNoise
            self._rnnoise = RNNoise(sample_rate=sample_rate)
            logger.info("RNNoise (pyrnnoise) initialized.")
        except Exception as e:
            logger.warning(f"RNNoise unavailable, bypassing: {e}")

    def push_playback_reference(self, ref_pcm_i16: np.ndarray):
        """Feeds far-end TTS playback PCM frames into the echo-cancellation reference buffer."""
        if ref_pcm_i16 is None or len(ref_pcm_i16) == 0:
            return
        arr = np.asarray(ref_pcm_i16, dtype=np.int16).reshape(-1)
        for i in range(0, len(arr), self.aec_frame_size):
            chunk = arr[i : i + self.aec_frame_size]
            if len(chunk) < self.aec_frame_size:
                chunk = np.pad(chunk, (0, self.aec_frame_size - len(chunk)))
            self._ref_queue.append(chunk)

    def _pop_ref_frame(self) -> np.ndarray:
        if self._ref_queue:
            return self._ref_queue.popleft()
        return np.zeros(self.aec_frame_size, dtype=np.int16)

    def process(self, mic_pcm_i16: np.ndarray) -> np.ndarray:
        """Applies AEC + RNNoise to an int16 mono PCM frame and returns enhanced int16 PCM."""
        out = np.asarray(mic_pcm_i16, dtype=np.int16).reshape(-1)
        if len(out) == 0:
            return out

        # 1. Echo Cancellation (160-sample / 10 ms sub-frames)
        if self._aec is not None and len(out) >= self.aec_frame_size:
            aec_chunks = []
            rem = len(out) % self.aec_frame_size
            usable = len(out) - rem
            for i in range(0, usable, self.aec_frame_size):
                mic_sub = out[i : i + self.aec_frame_size]
                ref_sub = self._pop_ref_frame()
                try:
                    cleaned = self._aec.cancel_echo(mic_sub, ref_sub)
                    aec_chunks.append(np.asarray(cleaned, dtype=np.int16))
                except Exception:
                    aec_chunks.append(mic_sub)
            if rem:
                aec_chunks.append(out[usable:])
            out = np.concatenate(aec_chunks)

        # 2. Neural Noise Suppression (RNNoise)
        if self._rnnoise is not None:
            try:
                denoised_frames = []
                for _prob, frame in self._rnnoise.denoise_chunk(out.reshape(1, -1)):
                    denoised_frames.append(np.asarray(frame, dtype=np.int16).reshape(-1))
                if denoised_frames:
                    denoised = np.concatenate(denoised_frames)
                    if len(denoised) >= len(out):
                        out = denoised[: len(out)]
                    else:
                        out = np.pad(denoised, (0, len(out) - len(denoised)))
            except Exception:
                pass

        return out
