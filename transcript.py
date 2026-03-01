from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np
import queue
import threading

# Load model once (shared by worker thread).
# the unauthenticated-request warning and get higher rate limits when downloading the model.
model = WhisperModel("base", device="cpu", compute_type="int8")

SAMPLE_RATE = 16000
CHANNELS = 1
BUFFER_DURATION = 1   # seconds per segment (shorter = more real-time, more CPU)
# sounddevice will call callback with blocks; typical blocksize 1024–2048
BLOCKSIZE = 1024

audio_queue = queue.Queue()           # raw chunks from mic
transcribe_queue = queue.Queue()       # full segments for worker to transcribe

# Ring buffer for building segments
buf_size = int(SAMPLE_RATE * BUFFER_DURATION)
audio_buffer = np.zeros(buf_size, dtype=np.float32)
buffer_index = 0

def callback(indata, frames, time, status):
    if status:
        print(status)
    audio_queue.put(indata.copy())

def transcription_worker():
    while True:
        segment = transcribe_queue.get()
        if segment is None:
            break
        try:
            segments, info = model.transcribe(
                segment,
                language="en",
                vad_filter=False,
                clip_timestamps=[0, len(segment) / SAMPLE_RATE],
            )
            text = " ".join(s.text for s in segments).strip()
            if text:
                print("Transcription:", text)
        except Exception as e:
            print("Transcribe error:", e)

def main():
    global buffer_index
    worker = threading.Thread(target=transcription_worker, daemon=True)
    worker.start()

    print("Listening... Press Ctrl+C to stop.")

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS,
                        blocksize=BLOCKSIZE, callback=callback):
        try:
            while True:
                chunk = audio_queue.get()
                chunk = np.squeeze(chunk)
                if chunk.dtype != np.float32:
                    chunk = (chunk / np.iinfo(chunk.dtype).max).astype(np.float32)

                n = len(chunk)
                if buffer_index + n > len(audio_buffer):
                    # Discard oldest bytes to make room (ring buffer)
                    discard = (buffer_index + n) - len(audio_buffer)
                    audio_buffer[:buffer_index - discard] = audio_buffer[discard:buffer_index]
                    buffer_index -= discard

                audio_buffer[buffer_index:buffer_index + n] = chunk
                buffer_index += n

                # When we have a full segment, send to worker and reset
                if buffer_index >= len(audio_buffer):
                    transcribe_queue.put(audio_buffer.copy())
                    buffer_index = 0
        except KeyboardInterrupt:
            print("Stopped listening.")

    transcribe_queue.put(None)  # signal worker to exit
    worker.join(timeout=2)

if __name__ == "__main__":
    main()