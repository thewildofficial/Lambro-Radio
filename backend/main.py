from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
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
from cachetools import LRUCache

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
    final_processed_temp_file_path = None  # This will be an in-memory buffer now
    ffmpeg_process = None

    try:
        print(f"ffmpeg: Processing URL {audio_url} with{' AI preset' if ai_preset else ''} for initial conversion...")
        
        ffmpeg_command_initial = ['ffmpeg', '-i', audio_url]
        
        # Apply AI preset filters directly in this ffmpeg step if requested
        if ai_preset:
            # Insert AI preset filter before output format specifiers
            ai_filters = ['-af', 'aecho=0.8:0.88:60|120:0.4|0.3,aecho=0.6:0.7:100|200:0.3|0.2']
            ffmpeg_command_initial += ai_filters
        
        # Add remaining ffmpeg options for output
        ffmpeg_command_initial += [
            '-vn',                  # No video
            '-acodec', 'pcm_s16le', # Output raw PCM
            '-ar', '44100',         # Sample rate
            '-ac', '2',             # Stereo
            '-f', 'wav',            # Output format hint (though it's raw PCM to pipe)
            '-'                     # Output to stdout
        ]

        print(f"Executing ffmpeg command: {' '.join(ffmpeg_command_initial)}") # Log the command

        ffmpeg_process = await asyncio.create_subprocess_exec(
            *ffmpeg_command_initial,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        ffmpeg_stdout_data, ffmpeg_stderr_data = await ffmpeg_process.communicate()
        
        ffmpeg_stderr_str = ffmpeg_stderr_data.decode(errors='ignore').strip()
        if ffmpeg_stderr_str: # Always log stderr if it contains anything
            print(f"ffmpeg stderr output:\n{ffmpeg_stderr_str}")

        if ffmpeg_process.returncode != 0:
            error_message_ffmpeg = f"ffmpeg (processing URL) failed (code {ffmpeg_process.returncode}). See stderr above."
            # print already handled by the check above
            raise HTTPException(status_code=500, detail=error_message_ffmpeg)
        elif not ffmpeg_stdout_data:
            error_message_ffmpeg_nodata = f"ffmpeg (processing URL) produced no output. See stderr above."
            # print already handled by the check above
            raise HTTPException(status_code=500, detail=error_message_ffmpeg_nodata)
        
        print("ffmpeg: Processing of URL completed. Reading into soundfile...")

        # 2. Soundfile reads from ffmpeg's stdout
        try:
            y, sr = sf.read(io.BytesIO(ffmpeg_stdout_data), dtype='float32')
            print(f"Soundfile: Read audio from ffmpeg. Sample Rate: {sr}, Shape: {y.shape}")
        except Exception as e:
            # ffmpeg_stderr_str should be already defined and printed from above
            error_message_sf_read = f"Soundfile failed to read ffmpeg output: {e}. Check ffmpeg stderr logged above."
            print(error_message_sf_read)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_message_sf_read)

        # 3. PyRubberband for pitch shifting (if target_frequency is set)
        y_shifted = y
        if target_frequency is not None: # Only apply if target_frequency is not None
            semitones_shift = calculate_semitones(target_frequency)
            print(f"PyRubberband: Calculated Semitones Shift: {semitones_shift}")
            if semitones_shift != 0:
                print("PyRubberband: Applying pitch shift...")
                if y.dtype != np.float32: # Ensure float32 for pyrubberband
                    y_to_shift = y.astype(np.float32)
                else:
                    y_to_shift = y
                
                if y_to_shift.ndim == 1: # Mono
                    y_to_shift = np.stack((y_to_shift, y_to_shift), axis=-1)

                y_shifted = pyrb.pitch_shift(y_to_shift, sr, semitones_shift)
                print("PyRubberband: Pitch shift applied.")
        else:
            if y_shifted.ndim == 1:
                 y_shifted = np.stack((y_shifted, y_shifted), axis=-1)


        # 4. Write final processed audio to an in-memory buffer for streaming
        print("Soundfile: Preparing in-memory buffer for final processed audio...")
        in_memory_audio_buffer = io.BytesIO()
        
        try:
            sf.write(in_memory_audio_buffer, y_shifted, sr, format='WAV', subtype='PCM_16')
            in_memory_audio_buffer.seek(0) # Reset buffer position to the beginning for reading
            print(f"Soundfile: Final processed audio written to in-memory buffer. Size: {in_memory_audio_buffer.getbuffer().nbytes} bytes")
        except Exception as e:
            error_message_sf_write = f"Soundfile failed to write final processed audio to in-memory buffer: {e}"
            print(error_message_sf_write)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_message_sf_write)

        # 5. Stream the final processed audio from the in-memory buffer
        chunk_size = 8192
        # No longer need to open a file; read directly from in_memory_audio_buffer
        while True:
            chunk = in_memory_audio_buffer.read(chunk_size)
            if not chunk:
                break
            yield chunk
            await asyncio.sleep(0.001) 
        print("Streaming from in-memory buffer completed.")

    except Exception as e:
        # General exception handling for the generator
        print(f"Error during audio processing and streaming generator: {e}")
        traceback.print_exc()
        # If headers not sent, FastAPI handles raising HTTPException. 
        # If headers sent, this might be too late for a clean HTTP error, 
        # but logging is crucial.
        # Ensure the error is propagated if possible, or client sees a broken stream.
        # For now, we'll rely on FastAPI's default handling if this exception bubbles up
        # before any `yield` has occurred, or the stream breaking if after a `yield`.
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
