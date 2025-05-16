from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yt_dlp
import io
import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, PitchShift
import math
import asyncio
import tempfile
import os
import traceback
import subprocess
from cachetools import LRUCache
from typing import Optional, Tuple, List, Dict, Any

app = FastAPI(title="Lambro Radio Backend")

# CORS configuration
origins = [
    "http://localhost:3000",  # Common Next.js dev port
    "http://127.0.0.1:3000",
    "http://localhost:3002",  # Your current Next.js port
    "http://127.0.0.1:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600
)

# Cache for /get_audio_info responses
audio_info_cache = LRUCache(maxsize=128)

@app.get("/")
async def read_root():
    return {"message": "Welcome to Lambro Radio Backend"}

@app.post("/get_audio_info")
async def get_audio_info(payload: dict):
    print(f"Received get_audio_info request with payload: {payload}")
    url = payload.get("url")
    if not url:
        print("Error: URL is required but not provided")
        raise HTTPException(status_code=400, detail="URL is required")

    # Check cache first
    if url in audio_info_cache:
        print(f"Cache hit for URL: {url}")
        return audio_info_cache[url]
    
    print(f"Cache miss for URL: {url}. Fetching from yt-dlp...")

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
                # Extract thumbnail URL (use the last one, usually highest quality)
                thumbnails = info.get('thumbnails', [])
                thumbnail_url = thumbnails[-1]['url'] if thumbnails else None
                response_data = {
                    "message": "Audio info retrieved successfully",
                    "audio_stream_url": audio_url,
                    "title": info.get('title', 'Unknown Title'),
                    "duration": info.get('duration', 0),
                    "thumbnail_url": thumbnail_url
                }
                audio_info_cache[url] = response_data # Store successful response in cache
                return response_data
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

async def process_and_stream_audio_generator(audio_url: str, target_frequency: float | None, ai_preset: bool = False):
    final_processed_temp_file_path = None
    ffmpeg_process = None

    try:
        print(f"ffmpeg: Processing URL {audio_url} with{' AI preset' if ai_preset else ''} for initial conversion (pre-pitch shift)...")
        
        ffmpeg_command_parts = ['ffmpeg', '-i', audio_url]
        
        audio_filters_ffmpeg_initial = []
        if ai_preset:
            ai_echo_filters = "aecho=0.8:0.88:60|120:0.4|0.3,aecho=0.6:0.7:100|200:0.3|0.2"
            audio_filters_ffmpeg_initial.append(ai_echo_filters)
        
        if audio_filters_ffmpeg_initial:
            ffmpeg_command_parts.extend(['-af', ",".join(audio_filters_ffmpeg_initial)])
        
        ffmpeg_command_parts += [
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-ac', '2',
            '-f', 'wav',
            '-'
        ]

        print(f"Executing ffmpeg command (initial conversion): {' '.join(ffmpeg_command_parts)}")

        ffmpeg_process = await asyncio.create_subprocess_exec(
            *ffmpeg_command_parts,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        ffmpeg_stdout_data, ffmpeg_stderr_data = await ffmpeg_process.communicate()
        
        ffmpeg_stderr_str = ffmpeg_stderr_data.decode(errors='ignore').strip()
        if ffmpeg_stderr_str:
            print(f"ffmpeg stderr output (initial conversion):\n{ffmpeg_stderr_str}")

        if ffmpeg_process.returncode != 0:
            error_message_ffmpeg = f"ffmpeg (initial conversion) failed (code {ffmpeg_process.returncode}). See stderr."
            raise HTTPException(status_code=500, detail=error_message_ffmpeg)
        elif not ffmpeg_stdout_data:
            error_message_ffmpeg_nodata = f"ffmpeg (initial conversion) produced no output. See stderr."
            raise HTTPException(status_code=500, detail=error_message_ffmpeg_nodata)
        
        print("ffmpeg: Initial conversion completed. Reading into soundfile...")

        # 2. Soundfile reads from ffmpeg's stdout
        try:
            y, sr = sf.read(io.BytesIO(ffmpeg_stdout_data), dtype='float32')
            print(f"Soundfile: Read audio from ffmpeg. Sample Rate: {sr}, Shape: {y.shape}")
        except Exception as e:
            error_message_sf_read = f"Soundfile failed to read ffmpeg output: {e}. Check ffmpeg stderr."
            print(error_message_sf_read)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_message_sf_read)

        # 3. Pitch Shifting (if target_frequency is set) using spotify-pedalboard
        y_processed = y 
        if target_frequency is not None: 
            semitones_shift = calculate_semitones(target_frequency)
            print(f"Pedalboard: Calculated Semitones Shift: {semitones_shift}")
            if semitones_shift != 0:
                print("Pedalboard: Applying pitch shift...")
                y_to_shift = y_processed
                transposed_to_pedalboard = False
                if y_to_shift.ndim == 2 and y_to_shift.shape[1] > 1: 
                    y_to_shift = y_to_shift.T 
                    transposed_to_pedalboard = True
                try:
                    board = Pedalboard([PitchShift(semitones=semitones_shift)], sample_rate=sr)
                    y_shifted_pb = board(y_to_shift) 
                    if transposed_to_pedalboard and y_shifted_pb.ndim == 2:
                        y_processed = y_shifted_pb.T 
                    else:
                        y_processed = y_shifted_pb 
                    print("Pedalboard: Pitch shift applied.")
                except Exception as e:
                    print(f"Error during spotify-pedalboard pitch shifting: {e}")
                    traceback.print_exc()
                    # Fallback to y_processed without pitch shift
        
        # Ensure y_processed is stereo for sf.write
        if y_processed.ndim == 1:
             print("Ensuring stereo output for mono processed audio.")
             y_processed = np.stack((y_processed, y_processed), axis=-1)
        elif y_processed.ndim == 2 and y_processed.shape[1] == 1 : # Mono in shape (N,1)
             print("Ensuring stereo output for mono (N,1) processed audio.")
             y_processed = np.concatenate((y_processed, y_processed), axis=1)


        # 4. Write final processed audio to an in-memory buffer for streaming
        print("Soundfile: Preparing in-memory buffer for final processed audio...")
        in_memory_audio_buffer = io.BytesIO()
        try:
            sf.write(in_memory_audio_buffer, y_processed, sr, format='WAV', subtype='PCM_16')
            in_memory_audio_buffer.seek(0) 
            print(f"Soundfile: Final processed audio written to in-memory buffer. Size: {in_memory_audio_buffer.getbuffer().nbytes} bytes")
        except Exception as e:
            error_message_sf_write = f"Soundfile failed to write final processed audio: {e}"
            print(error_message_sf_write)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_message_sf_write)

        # 5. Stream the final processed audio
        chunk_size = 8192
        while True:
            chunk = in_memory_audio_buffer.read(chunk_size)
            if not chunk:
                break
            yield chunk
            await asyncio.sleep(0.001) 
        print("Streaming from soundfile-written buffer completed.")

    except Exception as e:
        print(f"Error during audio processing and streaming generator: {e}")
        traceback.print_exc()
        raise # Re-raise the exception to be handled by FastAPI or calling function
    finally:
        # Clean up: ffmpeg process is handled by communicate().
        # No temporary file to delete on disk for the final audio anymore.
        # If in_memory_audio_buffer needs explicit closing, it would be here, 
        # but BytesIO usually managed by GC.
        if final_processed_temp_file_path: # This var is no longer used for a path
            pass # No disk file to clean up for final_processed_temp_file_path
        print("process_and_stream_audio_generator finished.")

@app.post("/process_audio")
async def stream_processed_audio_endpoint(
    payload: dict = Body(...)
):
    print(f"Received process_audio request with payload: {payload}")
    audio_stream_url = payload.get("audio_stream_url")
    target_frequency = payload.get("target_frequency")
    ai_preset = payload.get("ai_preset", False)

    if not audio_stream_url:
        print("Error: audio_stream_url is required but not provided")
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
        process_and_stream_audio_generator(audio_stream_url, target_freq_float, ai_preset),
        media_type="audio/wav"
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
