from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yt_dlp
import io
import numpy as np
import soundfile as sf
import pyrubberband as pyrb
import math
import asyncio
import tempfile
import os
import traceback
import subprocess

app = FastAPI(title="Lambro Radio Backend")

# CORS configuration
origins = [
    "http://localhost:3000",  # Allow Next.js dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Welcome to Lambro Radio Backend"}

@app.post("/get_audio_info")
async def get_audio_info(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            audio_url = None
            # Find best audio format
            for f in info.get('formats', []):
                if f.get('acodec') != 'none' and f.get('vcodec') == 'none' and f.get('url'):
                    if f.get('ext') in ['opus', 'webm', 'm4a']:
                        audio_url = f['url']
                        break
            # Fallback 1
            if not audio_url:
                for f in info.get('formats', []):
                     if f.get('acodec') != 'none' and f.get('vcodec') == 'none' and f.get('url'):
                         audio_url = f['url']
                         break
            # Fallback 2
            if not audio_url and info.get('acodec') != 'none' and info.get('vcodec') == 'none' and info.get('url'):
                audio_url = info['url']

            # Return info or raise error
            if audio_url:
                return {
                    "message": "Audio info retrieved successfully",
                    "audio_stream_url": audio_url,
                    "title": info.get('title', 'Unknown Title'),
                    "duration": info.get('duration', 0)
                }
            else:
                raise HTTPException(status_code=404, detail="Suitable audio stream not found.")

    except yt_dlp.utils.DownloadError as e:
        print(f"yt-dlp Download Error: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing YouTube URL: {e}")
    except Exception as e:
        print(f"An unexpected error occurred in get_audio_info: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error processing request.")

def calculate_semitones(target_hz, base_hz=440.0):
    if target_hz is None or target_hz <= 0 or base_hz <= 0:
        return 0
    return 12 * math.log2(target_hz / base_hz)

async def process_and_stream_audio_generator(audio_url: str, target_frequency: float | None):
    temp_output_path = None
    ffmpeg_process = None
    try:
        # Create temp file for output WAV
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_output_file:
            temp_output_path = temp_output_file.name

        print(f"Starting ffmpeg to process URL...")
        ffmpeg_command = [
            'ffmpeg',
            '-i', audio_url,
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-ac', '2',
            '-f', 'wav',
            '-'
        ]

        ffmpeg_process = await asyncio.create_subprocess_exec(
            *ffmpeg_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout_data, stderr_data = await ffmpeg_process.communicate()

        if ffmpeg_process.returncode != 0:
            print(f"ffmpeg process failed with code {ffmpeg_process.returncode}")
            print(f"ffmpeg stderr:\n{stderr_data.decode(errors='ignore')}")
            raise HTTPException(status_code=500, detail=f"ffmpeg failed processing stream (code {ffmpeg_process.returncode})")
        elif not stdout_data:
             print(f"ffmpeg produced no output data.")
             print(f"ffmpeg stderr:\n{stderr_data.decode(errors='ignore')}")
             raise HTTPException(status_code=500, detail=f"ffmpeg produced no audio data.")
        else:
             print("ffmpeg process completed successfully, reading data...")

        try:
            y, sr = sf.read(io.BytesIO(stdout_data), dtype='float32')
            print(f"Read audio from ffmpeg buffer. Sample Rate: {sr}, Shape: {y.shape}")
        except Exception as e:
            print(f"Error reading audio buffer from ffmpeg with soundfile: {e}")
            print(f"ffmpeg stderr:\n{stderr_data.decode(errors='ignore')}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Could not read audio buffer via ffmpeg: {e}")

        semitones_shift = calculate_semitones(target_frequency)
        print(f"Calculated Semitones Shift: {semitones_shift}")

        y_shifted = y
        if semitones_shift != 0:
            print("Applying pitch shift...")
            if y.dtype != np.float32:
                y = y.astype(np.float32)
            y_shifted = pyrb.pitch_shift(y, sr, semitones_shift)
            print("Pitch shift applied.")

        try:
            sf.write(temp_output_path, y_shifted, sr, format='WAV', subtype='PCM_16')
            print(f"Processed audio saved to temp WAV file: {temp_output_path}")
        except Exception as e:
            print(f"Error writing processed audio: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Could not write processed audio: {e}")

        chunk_size = 8192
        with open(temp_output_path, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk
                await asyncio.sleep(0.001)

    except Exception as e:
        print(f"General Error during audio processing: {e}")
        traceback.print_exc()
        if ffmpeg_process and ffmpeg_process.returncode is None:
            try:
                ffmpeg_process.terminate()
                await ffmpeg_process.wait()
                print("Terminated ffmpeg process due to error.")
            except ProcessLookupError:
                pass
            except Exception as term_err:
                print(f"Error terminating ffmpeg: {term_err}")
        if not isinstance(e, HTTPException):
             raise HTTPException(status_code=500, detail=f"Internal server error during audio processing.")
        else:
             raise e
    finally:
        if temp_output_path and os.path.exists(temp_output_path):
            try:
                os.remove(temp_output_path)
                print(f"Cleaned up temp output file: {temp_output_path}")
            except OSError as e:
                print(f"Error removing temp output file {temp_output_path}: {e}")

@app.post("/process_audio")
async def stream_processed_audio_endpoint(
    payload: dict = Body(...)
):
    audio_stream_url = payload.get("audio_stream_url")
    target_frequency = payload.get("target_frequency")

    if not audio_stream_url:
        raise HTTPException(status_code=400, detail="audio_stream_url is required")

    target_freq_float: float | None = None
    if target_frequency is not None:
        try:
            target_freq_float = float(target_frequency)
            if target_freq_float <= 0:
                 raise ValueError("Frequency must be positive")
        except (ValueError, TypeError):
             raise HTTPException(status_code=400, detail="Invalid target_frequency value. Must be a positive number.")

    return StreamingResponse(
        process_and_stream_audio_generator(audio_stream_url, target_freq_float),
        media_type="audio/wav"
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
