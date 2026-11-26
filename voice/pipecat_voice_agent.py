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
import aiohttp
from aiohttp import web

from pipecat.frames.frames import (
    AudioRawFrame,
    Frame,
    InputAudioRawFrame,
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

            speech_thresh = 0.45 if self._vad_speaking else 0.58
            if prob >= speech_thresh:
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
                # Cap continuous speech buffer at 15 seconds to prevent unbounded growth
                if len(self._speech_buffer) >= SAMPLE_RATE * 2 * 15:
                    utterance = bytes(self._speech_buffer)
                    self._speech_buffer.clear()
                    self._vad_speaking = False
                    emit_event({"event": "vad", "speaking": False})
                    await self.push_frame(UserStoppedSpeakingFrame(), direction)
                    await self.push_frame(
                        InputAudioRawFrame(audio=utterance, sample_rate=SAMPLE_RATE, num_channels=1),
                        direction,
                    )
            else:
                if self._vad_speaking:
                    self._speech_buffer.extend(enhanced_bytes)
                    self._silence_frames += 1
                    # ~480ms silence (15 * 32ms) ends the utterance for snappy voice-to-voice turn-taking
                    if self._silence_frames >= 15:
                        self._vad_speaking = False
                        self._silence_frames = 0
                        emit_event({"event": "vad", "speaking": False})
                        await self.push_frame(UserStoppedSpeakingFrame(), direction)
                        if len(self._speech_buffer) >= SAMPLE_RATE * 2 * 0.35:
                            utterance = bytes(self._speech_buffer)
                            self._speech_buffer.clear()
                            await self.push_frame(
                                InputAudioRawFrame(audio=utterance, sample_rate=SAMPLE_RATE, num_channels=1),
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

    def _load_offline_whisper(self):
        if self._faster_whisper is not None:
            return self._faster_whisper
        from faster_whisper import WhisperModel
        preferred = os.getenv("OFFLINE_STT_MODEL", "distil-small.en").strip() or "distil-small.en"
        candidates = []
        for m in (preferred, "small.en", "tiny.en"):
            if m not in candidates:
                candidates.append(m)
        for model_name in candidates:
            try:
                self._faster_whisper = WhisperModel(
                    model_name,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=min(4, os.cpu_count() or 4),
                )
                self._offline_model_name = model_name
                emit_event({"event": "offline_stt_loaded", "model": model_name})
                return self._faster_whisper
            except Exception as e:
                emit_event({"event": "offline_stt_load_failed", "model": model_name, "error": str(e)})
        return None

    async def _transcribe(self, pcm_bytes: bytes) -> str:
        groq_key = Config.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        deepgram_key = Config.DEEPGRAM_API_KEY or os.getenv("DEEPGRAM_API_KEY", "")
        wav_bytes = self._pcm_to_wav_bytes(pcm_bytes)

        def _clean_stt_text(raw: str) -> str:
            t = (raw or "").strip()
            # Ignore pure punctuation or common Whisper silence artifacts
            stripped = "".join(ch for ch in t if ch.isalnum() or ch.isspace()).strip()
            if not stripped or len(stripped) < 2:
                return ""
            if stripped.lower() in {"thank you", "thanks for watching", "you", "bye", "mbc"}:
                return ""
            return t

        if groq_key:
            try:
                form = aiohttp.FormData()
                form.add_field("file", wav_bytes, filename="speech.wav", content_type="audio/wav")
                form.add_field("model", "whisper-large-v3-turbo")
                form.add_field("response_format", "json")
                form.add_field("temperature", "0.0")
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10.0)) as client:
                    async with client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        data=form,
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            return _clean_stt_text(data.get("text", ""))
                        else:
                            emit_event({"event": "stt_error", "provider": "groq", "status": resp.status})
            except Exception as e:
                emit_event({"event": "stt_error", "provider": "groq", "error": str(e)})

        if deepgram_key:
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10.0)) as client:
                    async with client.post(
                        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
                        headers={"Authorization": f"Token {deepgram_key}", "Content-Type": "audio/wav"},
                        data=wav_bytes,
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            alt = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0]
                            return _clean_stt_text(alt.get("transcript", ""))
            except Exception as e:
                emit_event({"event": "stt_error", "provider": "deepgram", "error": str(e)})

        # Offline Faster-Whisper fallback (distil-small.en -> small.en -> tiny.en)
        try:
            model = await asyncio.to_thread(self._load_offline_whisper)
            if model is None:
                return ""
            audio_f32 = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            segments, _ = await asyncio.to_thread(
                model.transcribe,
                audio_f32,
                beam_size=1,
                vad_filter=True,
                language="en",
            )
            return _clean_stt_text(" ".join(s.text.strip() for s in segments))
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
            await task.queue_frame(InputAudioRawFrame(audio=raw, sample_rate=SAMPLE_RATE, num_channels=1))

    await run_control_server(vad_oww, ecapa_stt, verifier)
    emit_event({"status": "ready", "engine": "Pipecat_Silero_OpenWakeWord_ECAPA"})

    async def _run_pipeline_loop():
        while True:
            try:
                with sd.InputStream(
                    samplerate=SAMPLE_RATE,
                    channels=1,
                    dtype="int16",
                    blocksize=VAD_FRAME_SAMPLES,
                    callback=mic_callback,
                ):
                    await asyncio.gather(runner.run(task), feed_audio())
            except Exception as e:
                emit_event({"event": "audio_stream_error", "error": str(e)})
                await asyncio.sleep(2.0)

    await _run_pipeline_loop()


if __name__ == "__main__":
    asyncio.run(main())
