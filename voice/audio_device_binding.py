import logging
import queue
import threading
import sounddevice as sd
import numpy as np

logger = logging.getLogger("NAVI_AudioBinding")

class AudioDeviceBinding:
    """
    Binds local hardware audio devices (Windows default Microphone & Speakers)
    to the conversational voice pipeline.
    """

    def __init__(self, sample_rate: int = 16000, channels: int = 1, chunk_size: int = 1024):
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = chunk_size

        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()

        self._input_stream = None
        self._output_stream = None
        self._is_running = False

    @staticmethod
    def list_audio_devices():
        """Lists all physical and virtual audio input/output devices on the machine."""
        devices = sd.query_devices()
        print("\n=== AVAILABLE AUDIO HARDWARE ON THIS PC ===")
        for idx, dev in enumerate(devices):
            input_ch = dev.get("max_input_channels", 0)
            output_ch = dev.get("max_output_channels", 0)
            kind = []
            if input_ch > 0:
                kind.append("MIC/INPUT")
            if output_ch > 0:
                kind.append("SPEAKER/OUTPUT")
            type_str = " | ".join(kind)
            print(f"[{idx:2d}] {dev['name']} ({type_str})")
        print("===========================================\n")
        return devices

    def _mic_callback(self, indata, frames, time_info, status):
        """Continuous callback capturing microphone PCM frames."""
        if status:
            logger.debug(f"Mic status: {status}")
        # Copy audio data into the processing queue
        self.input_queue.put(indata.copy())

    def _speaker_callback(self, outdata, frames, time_info, status):
        """Continuous callback feeding audio data to the speakers."""
        if status:
            logger.debug(f"Speaker status: {status}")
        try:
            data = self.output_queue.get_nowait()
            if len(data) < len(outdata):
                outdata[:len(data)] = data
                outdata[len(data):] = 0
            else:
                outdata[:] = data[:len(outdata)]
        except queue.Empty:
            outdata.fill(0)

    def start_hardware_streams(self, input_device_id: int = None, output_device_id: int = None):
        """Starts full-duplex audio capturing from mic and playback to speakers."""
        if self._is_running:
            return

        logger.info("Initializing Windows microphone and speaker hardware streams...")
        self._input_stream = sd.InputStream(
            device=input_device_id,
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",
            blocksize=self.chunk_size,
            callback=self._mic_callback
        )

        self._output_stream = sd.OutputStream(
            device=output_device_id,
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",
            blocksize=self.chunk_size,
            callback=self._speaker_callback
        )

        self._input_stream.start()
        self._output_stream.start()
        self._is_running = True
        logger.info("Local audio hardware bound successfully. Mic and speaker active.")

    def play_audio_chunk(self, audio_bytes: bytes):
        """Pushes raw PCM audio bytes to the speaker output queue."""
        if not audio_bytes:
            return
        elem_size = 2 * self.channels
        remainder = len(audio_bytes) % elem_size
        if remainder != 0:
            audio_bytes = audio_bytes[:-remainder]
        if not audio_bytes:
            return
        data = np.frombuffer(audio_bytes, dtype=np.int16).reshape(-1, self.channels)
        self.output_queue.put(data)

    def read_mic_chunk(self, timeout: float = 0.0) -> bytes:
        """Reads the next available PCM chunk from the microphone queue without blocking."""
        try:
            if timeout <= 0:
                chunk = self.input_queue.get_nowait()
            else:
                chunk = self.input_queue.get(timeout=timeout)
            return chunk.tobytes()
        except queue.Empty:
            return b""

    def stop_hardware_streams(self):
        """Gracefully closes microphone and speaker streams."""
        self._is_running = False
        if self._input_stream:
            self._input_stream.stop()
            self._input_stream.close()
        if self._output_stream:
            self._output_stream.stop()
            self._output_stream.close()
        logger.info("Audio hardware streams closed.")

if __name__ == "__main__":
    AudioDeviceBinding.list_audio_devices()
