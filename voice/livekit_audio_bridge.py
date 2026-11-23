import asyncio
import logging
import time
from voice.audio_device_binding import AudioDeviceBinding

logger = logging.getLogger("NAVI_LiveKitBridge")

class LiveKitAudioBridge:
    """
    Connects the local Windows hardware (Mic & Speaker) to LiveKit's WebRTC audio tracks.
    """

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.binding = AudioDeviceBinding(sample_rate=sample_rate, channels=channels)
        self._streaming = False

    def start_local_audio(self):
        """Starts capturing microphone input and playing speaker output."""
        self.binding.start_hardware_streams()
        self._streaming = True

    def stop_local_audio(self):
        """Stops hardware streams."""
        self._streaming = False
        self.binding.stop_hardware_streams()

    async def forward_mic_to_livekit(self, room, audio_source):
        """
        Continuously reads PCM chunks from the Windows mic and pushes them
        into LiveKit's AudioSource to broadcast to the room.
        """
        from livekit import rtc

        logger.info("Streaming Windows microphone to LiveKit AudioSource...")
        while self._streaming:
            chunk = self.binding.read_mic_chunk(timeout=0.05)
            if chunk:
                # 16000Hz, 1 channel, 16-bit int PCM = 2 bytes per sample
                num_samples = len(chunk) // 2
                frame = rtc.AudioFrame(
                    data=chunk,
                    sample_rate=self.sample_rate,
                    num_channels=self.channels,
                    samples_per_channel=num_samples
                )
                await audio_source.capture_frame(frame)
            await asyncio.sleep(0.001)

    async def forward_livekit_to_speaker(self, audio_stream):
        """
        Continuously receives audio frames from NAVI's LiveKit track and plays them
        through the local PC speakers.
        """
        logger.info("Receiving NAVI voice stream from LiveKit to PC speakers...")
        async for event in audio_stream:
            if not self._streaming:
                break
            frame = event.frame
            # Push raw PCM bytes to speaker queue
            self.binding.play_audio_chunk(frame.data.tobytes())

    def test_mic_and_speaker(self, duration_sec: int = 3):
        """
        Self-test utility: Records from mic for N seconds and plays it back through the speaker.
        Verifies local audio hardware is working.
        """
        print(f"\n[MIC TEST] Speak into your microphone now ({duration_sec} seconds)...")
        self.start_local_audio()
        recorded_chunks = []

        start_time = time.time()
        while time.time() - start_time < duration_sec:
            chunk = self.binding.read_mic_chunk(timeout=0.1)
            if chunk:
                recorded_chunks.append(chunk)

        print("[SPEAKER TEST] Playing your voice back through the speakers...")
        for chunk in recorded_chunks:
            self.binding.play_audio_chunk(chunk)
            time.sleep(len(chunk) / (self.sample_rate * 2))

        self.stop_local_audio()
        print("[✓] Audio Hardware Test Completed.\n")

if __name__ == "__main__":
    bridge = LiveKitAudioBridge()
    bridge.binding.list_audio_devices()
    bridge.test_mic_and_speaker()
