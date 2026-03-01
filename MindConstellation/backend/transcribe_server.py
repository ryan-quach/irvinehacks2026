"""
FastAPI server: WebSocket /ws/transcribe
Browser streams raw float32 PCM (16 kHz mono) as binary messages.
Server buffers 1-second segments (mirrors transcript.py ring-buffer logic),
transcribes each with Whisper, and sends back {"transcript": "..."} JSON.
"""
import os
import sys
import asyncio
import numpy as np
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from faster_whisper import WhisperModel

# Ensure this file's directory (backend/) is on the path so journal_processor is importable
# regardless of where uvicorn is launched from.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from journal_processor import build_row


# --- Whisper model (loaded once at startup) ---
model = WhisperModel("base", device="cpu", compute_type="int8")

SAMPLE_RATE = 16000          # Hz — must match browser AudioContext sample rate
BUFFER_DURATION = 1          # seconds per transcription segment

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def transcribe_segment(audio: np.ndarray) -> str:
    """Run Whisper on a float32 mono segment. Returns combined text."""
    if len(audio) == 0:
        return ""
    segments, _ = model.transcribe(
        audio,
        language="en",
        vad_filter=False,
        clip_timestamps=[0, len(audio) / SAMPLE_RATE],
    )
    return " ".join(s.text for s in segments).strip()


class TranscriptRequest(BaseModel):
    transcript: str


@app.post("/process-transcript")
async def process_transcript(req: TranscriptRequest):
    """Run journal_processor.build_row on the full session transcript.
    Prints the result to the server console and returns it as JSON."""
    loop = asyncio.get_event_loop()
    row = await loop.run_in_executor(None, build_row, req.transcript)
    print("\n=== JOURNAL ROW ===")
    print(json.dumps(row, indent=2))
    print("==================\n")
    return row


@app.websocket("/ws/transcribe")
async def ws_transcribe(websocket: WebSocket):
    await websocket.accept()

    buf_size = int(SAMPLE_RATE * BUFFER_DURATION)
    audio_buffer = np.zeros(buf_size, dtype=np.float32)
    buffer_index = 0
    loop = asyncio.get_event_loop()

    try:
        while True:
            # Receive raw float32 PCM bytes from the browser
            data = await websocket.receive_bytes()
            chunk = np.frombuffer(data, dtype=np.float32)

            n = len(chunk)

            # Fill the ring buffer, same logic as transcript.py
            if buffer_index + n > len(audio_buffer):
                discard = (buffer_index + n) - len(audio_buffer)
                audio_buffer[:buffer_index - discard] = audio_buffer[discard:buffer_index]
                buffer_index -= discard

            audio_buffer[buffer_index:buffer_index + n] = chunk
            buffer_index += n

            # When we have a full 1-second segment, transcribe it
            if buffer_index >= len(audio_buffer):
                segment = audio_buffer.copy()
                buffer_index = 0

                # Run blocking Whisper call off the event loop
                text = await loop.run_in_executor(None, transcribe_segment, segment)
                print("Transcription:", text)
                if text:
                    await websocket.send_json({"transcript": text})

    except WebSocketDisconnect:
        # Flush any remaining buffered audio on disconnect
        if buffer_index > 0:
            segment = audio_buffer[:buffer_index].copy()
            text = await loop.run_in_executor(None, transcribe_segment, segment)
            print("Transcription (flush):", text)
            # Client already disconnected — just log; don't send
        print("Client disconnected.")
    except Exception as e:
        print("WebSocket error:", e)
