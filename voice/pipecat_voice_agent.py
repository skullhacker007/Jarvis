import asyncio
import io
import json
import os
import sys
import time
import wave
import numpy as np
import sounddevice as sd
import torch
from aiohttp import web

from pipecat.frames.frames import (
    AudioRawFrame,
    Frame,
    InterruptionFrame,
    TextFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

# Ensure project root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import Config
from voice.ecapa_verifier import EcapaSpeakerVerifier
from voice.audio_enhancer import AudioEnhancer

SAMPLE_RATE = 16000
VAD_FRAME_SAMPLES = 512      # 32 ms @ 16 kHz (required by Silero VAD)
OWW_FRAME_SAMPLES = 1280     # 80 ms @ 16 kHz (required by openWakeWord)
CONTROL_PORT = int(os.environ.get("PIPECAT_CONTROL_PORT", "5007"))


def emit_event(payload: dict):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


class SileroWakeWordProcessor(FrameProcessor):
    """
    Pipecat FrameProcessor combining:
    - Silero VAD (16 kHz neural voice activity detection)
    - openWakeWord ('hey_jarvis' ONNX wake-word detection)
    """

    def __init__(self):
        super().__init__()
        from silero_vad import load_silero_vad
        self._vad_model = load_silero_vad()
        self._vad_speaking = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()

        # Initialize openWakeWord with hey_jarvis model
        import openwakeword
        from openwakeword.model import Model as OWWModel

        try:
            openwakeword.utils.download_models(["hey_jarvis"])
        except Exception:
            pass
        self._oww = OWWModel(wakeword_models=["hey_jarvis"], inference_framework="onnx")
        self._oww_buf = np.zeros(0, dtype=np.int16)
        self._last_wake_ts = 0.0
        self.muted = False
        self.tts_active = False
        self._last_partial_ts = 0.0
        self.enhancer = AudioEnhancer(sample_rate=SAMPLE_RATE)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if not isinstance(frame, AudioRawFrame):
            await self.push_frame(frame, direction)
            return

        if self.muted:
            self._speech_buffer.clear()
            if self._vad_speaking:
                self._vad_speaking = False
                emit_event({"event": "vad", "speaking": False})
            return

        pcm_i16 = np.frombuffer(frame.audio, dtype=np.int16)
        # Apply WebRTC AEC3 + RNNoise before wake-word and VAD
        pcm_i16 = self.enhancer.process(pcm_i16)
        enhanced_bytes = pcm_i16.tobytes()

        # 1. openWakeWord check (1280-sample chunks)
        self._oww_buf = np.concatenate([self._oww_buf, pcm_i16])
        while len(self._oww_buf) >= OWW_FRAME_SAMPLES:
            chunk = self._oww_buf[:OWW_FRAME_SAMPLES]
            self._oww_buf = self._oww_buf[OWW_FRAME_SAMPLES:]
            preds = self._oww.predict(chunk)
            score = max(preds.values()) if preds else 0.0
            now = time.time()
            if score >= 0.55 and (now - self._last_wake_ts) > 2.0:
                self._last_wake_ts = now
                emit_event({"event": "wake_word", "text": "hey jarvis", "score": round(float(score), 3)})

        # 2. Silero VAD check (512-sample chunks)
        if len(pcm_i16) == VAD_FRAME_SAMPLES:
            audio_f32 = pcm_i16.astype(np.float32) / 32768.0
            with torch.no_grad():
                prob = float(self._vad_model(torch.from_numpy(audio_f32), SAMPLE_RATE).item())

            if prob >= 0.5:
                self._silence_frames = 0
                self._speech_buffer.extend(enhanced_bytes)
                if not self._vad_speaking:
                    self._vad_speaking = True
                    self._last_partial_ts = time.time()
                    emit_event({"event": "vad", "speaking": True})
                    if self.tts_active:
                        emit_event({"event": "interruption", "reason": "user_barge_in"})
                        await self.push_frame(InterruptionFrame(), direction)
                    await self.push_frame(UserStartedSpeakingFrame(), direction)
                elif (time.time() - self._last_partial_ts) >= 0.8 and len(self._speech_buffer) >= SAMPLE_RATE * 2 * 0.6:
                    self._last_partial_ts = time.time()
                    await self.push_frame(
                        AudioRawFrame(audio=bytes(self._speech_buffer), sample_rate=SAMPLE_RATE, num_channels=1),
                        direction,
                    )
            else:
                if self._vad_speaking:
                    self._speech_buffer.extend(enhanced_bytes)
                    self._silence_frames += 1
                    # ~540ms silence (17 * 32ms) ends the utterance
                    if self._silence_frames >= 17:
                        self._vad_speaking = False
                        self._silence_frames = 0
                        emit_event({"event": "vad", "speaking": False})
                        await self.push_frame(UserStoppedSpeakingFrame(), direction)
                        if len(self._speech_buffer) >= SAMPLE_RATE * 2 * 0.35:
                            utterance = bytes(self._speech_buffer)
                            self._speech_buffer.clear()
                            await self.push_frame(
                                AudioRawFrame(audio=utterance, sample_rate=SAMPLE_RATE, num_channels=1),
                                direction,
                            )
                        else:
                            self._speech_buffer.clear()


class EcapaAndSttProcessor(FrameProcessor):
    """
    Pipecat FrameProcessor performing:
    1. ECAPA-TDNN speaker verification on completed speech segments
    2. Groq Whisper STT (with Faster-Whisper offline fallback)
    """

    def __init__(self, verifier: EcapaSpeakerVerifier):
        super().__init__()
        self._verifier = verifier
        self._faster_whisper = None
        self.last_audio_i16 = None

    @staticmethod
    def _pcm_to_wav_bytes(pcm_bytes: bytes) -> bytes:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm_bytes)
        return buf.getvalue()

    async def _transcribe(self, pcm_bytes: bytes) -> str:
        groq_key = Config.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        wav_bytes = self._pcm_to_wav_bytes(pcm_bytes)

        if groq_key:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        files={"file": ("speech.wav", wav_bytes, "audio/wav")},
                        data={"model": "whisper-large-v3-turbo", "response_format": "json", "temperature": "0.0"},
                    )
                    if resp.status_code == 200:
                        return resp.json().get("text", "").strip()
            except Exception:
                pass

        # Offline Faster-Whisper fallback
        try:
            if self._faster_whisper is None:
                from faster_whisper import WhisperModel
                self._faster_whisper = WhisperModel("tiny.en", device="cpu", compute_type="int8")
            audio_f32 = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            segments, _ = await asyncio.to_thread(self._faster_whisper.transcribe, audio_f32, beam_size=1)
            return " ".join(s.text.strip() for s in segments).strip()
        except Exception:
            return ""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if not isinstance(frame, AudioRawFrame):
            await self.push_frame(frame, direction)
            return

        pcm_i16 = np.frombuffer(frame.audio, dtype=np.int16)
        self.last_audio_i16 = pcm_i16

        # 1. ECAPA-TDNN speaker verification + SpeechBrain-compatible anti-spoofing
        ver = await asyncio.to_thread(self._verifier.verify_with_antispoof, pcm_i16)
        emit_event({
            "event": "speaker_verified",
            "verified": ver["verified"],
            "confidence": ver["confidence"],
            "is_live": ver["is_live"],
            "spoof_score": ver["spoof_score"],
            "message": ver["message"],
        })

        # 2. Transcribe speech
        text = await self._transcribe(frame.audio)
        if text:
            lower = text.lower()
            is_wake = any(w in lower for w in ("hey jarvis", "jarvis", "ok jarvis"))
            emit_event({"event": "speech", "text": text, "is_wake_word": is_wake})
            await self.push_frame(TextFrame(text=text), direction)


async def run_control_server(vad_proc: SileroWakeWordProcessor, stt_proc: EcapaAndSttProcessor, verifier: EcapaSpeakerVerifier):
    async def handle_health(_req):
        return web.json_response({"status": "ok", "engine": "pipecat-silero-oww-ecapa"})

    async def handle_mute(req):
        data = await req.json()
        vad_proc.muted = bool(data.get("muted", False))
        return web.json_response({"ok": True, "muted": vad_proc.muted})

    async def handle_tts_state(req):
        data = await req.json()
        vad_proc.tts_active = bool(data.get("speaking", False))
        return web.json_response({"ok": True, "tts_active": vad_proc.tts_active})

    async def handle_enroll(_req):
        # Record 3 seconds from default mic for ECAPA-TDNN enrollment
        def _record_and_enroll():
            audio = sd.rec(int(3.0 * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype="int16")
            sd.wait()
            return verifier.enroll(audio.reshape(-1))

        ok, msg = await asyncio.to_thread(_record_and_enroll)
        return web.json_response({"ok": ok, "message": msg}, status=200 if ok else 400)

    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_post("/mute", handle_mute)
    app.router.add_post("/tts_state", handle_tts_state)
    app.router.add_post("/enroll", handle_enroll)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", CONTROL_PORT)
    await site.start()


async def main():
    verifier = EcapaSpeakerVerifier()
    vad_oww = SileroWakeWordProcessor()
    ecapa_stt = EcapaAndSttProcessor(verifier)

    pipeline = Pipeline([vad_oww, ecapa_stt])
    task = PipelineTask(pipeline)
    runner = PipelineRunner(handle_sigint=False)

    loop = asyncio.get_running_loop()
    audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=100)

    def mic_callback(indata, frames, time_info, status):
        raw = indata.copy().tobytes()
        try:
            loop.call_soon_threadsafe(audio_queue.put_nowait, raw)
        except Exception:
            pass

    async def feed_audio():
        while True:
            raw = await audio_queue.get()
            await task.queue_frame(AudioRawFrame(audio=raw, sample_rate=SAMPLE_RATE, num_channels=1))

    await run_control_server(vad_oww, ecapa_stt, verifier)
    emit_event({"status": "ready", "engine": "Pipecat_Silero_OpenWakeWord_ECAPA"})

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
        blocksize=VAD_FRAME_SAMPLES,
        callback=mic_callback,
    ):
        await asyncio.gather(runner.run(task), feed_audio())


if __name__ == "__main__":
    asyncio.run(main())
