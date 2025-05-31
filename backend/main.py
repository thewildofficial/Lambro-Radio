from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yt_dlp
import io
import math
import asyncio
import traceback
import subprocess
from cachetools import LRUCache
from typing import Optional, Any
import soundfile as sf
from pedalboard import Pedalboard, PitchShift, Reverb
import numpy as np
import aiohttp

app = FastAPI(title="Lambro Radio Backend")

# CORS configuration
origins = [
    "http://localhost:3000",  # Common Next.js dev port
    "http://127.0.0.1:3000",
    "http://localhost:3002",  # Your current Next.js port
    "http://127.0.0.1:3002",
    "https://*.vercel.app",   # All Vercel app subdomains
    "https://lambro-radio.vercel.app",  # Your specific Vercel domain (update this with your actual domain)
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

@app.get("/keep-alive")
async def keep_alive():
    """
    Keep-alive endpoint to prevent server from spinning down.
    This endpoint can be called periodically to keep the server active.
    """
    return {
        "status": "alive",
        "message": "Server is active",
        "timestamp": asyncio.get_event_loop().time()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Lambro Radio Backend",
        "version": "1.0.0"
    }

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

    # See https://github.com/yt-dlp/yt-dlp#format-selection-examples for format selection
    # We want a direct audio URL, preferring opus or aac (m4a).
    # 'bestaudio[ext=opus]/bestaudio[ext=m4a]/bestaudio/best' should prioritize these.
    # If yt-dlp has to extract, it will be slower, but this aims for direct links.
    ydl_opts = {
        'format': 'bestaudio[ext=opus]/bestaudio[ext=m4a]/bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'discard_in_playlist',
        # Anti-bot detection bypass options
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'referer': 'https://www.youtube.com/',
        'http_headers': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        },
        # YouTube-specific options
        'extractor_args': {
            'youtube': {
                'skip': ['hls', 'dash'],  # Skip adaptive formats that might be harder to access
                'player_client': ['android', 'web'],  # Try different player clients
                'player_skip': ['configs'],  # Skip player config checks
            }
        },
        # Retry options
        'retries': 3,
        'fragment_retries': 3,
        'extractor_retries': 3,
        'file_access_retries': 3,
        # Sleep between requests to avoid rate limiting
        'sleep_interval': 1,
        'max_sleep_interval': 5,
        'sleep_interval_subtitles': 1,
    }
    try:
        # We are calling extract_info with download=False, so it should only fetch metadata.
        # The format string primarily influences which URL is chosen from the available formats.
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await asyncio.to_thread(ydl.extract_info, url, download=False)

            # yt-dlp with download=False and a good format selector should ideally fill 'url'
            # at the top level of 'info' if a direct link matching the criteria is found.
            # Otherwise, we might still need to iterate formats if 'url' is not populated at the top level.

            audio_url = info.get('url') # This is often populated for single videos with good format selection

            if not audio_url: # Fallback: iterate through formats if top-level URL isn't what we want
                print("Top-level 'url' not found or not suitable, iterating formats...")
                selected_format = None
                for f in info.get('formats', []):
                    # Prioritize opus, then m4a (aac), then any other audio-only format
                     if f.get('acodec') != 'none' and f.get('vcodec') == 'none' and f.get('url'):
                        if f.get('ext') == 'opus':
                            selected_format = f
                            break
                        elif f.get('ext') == 'm4a' and not selected_format:
                            selected_format = f
                        elif not selected_format: # First audio-only if opus/m4a not found
                            selected_format = f
                
                if selected_format:
                    audio_url = selected_format.get('url')
                    print(f"Selected audio URL from formats list: {audio_url} (ext: {selected_format.get('ext')})")


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
        error_msg = str(e)
        print(f"yt-dlp Download Error: {error_msg}")
        
        # Provide more specific error messages for common YouTube issues
        if "Video unavailable" in error_msg or "This content isn't available" in error_msg:
            detail = f"YouTube video is unavailable or blocked. This may be due to geographic restrictions, privacy settings, or anti-bot detection. Error: {error_msg}"
        elif "Sign in to confirm your age" in error_msg:
            detail = f"Video requires age verification. Error: {error_msg}"
        elif "Private video" in error_msg:
            detail = f"Video is private. Error: {error_msg}"
        elif "Video has been removed" in error_msg:
            detail = f"Video has been removed by the user. Error: {error_msg}"
        else:
            detail = f"Error processing YouTube URL: {error_msg}"
            
        raise HTTPException(status_code=400, detail=detail)
    except Exception as e:
        error_msg = str(e)
        print(f"An unexpected error occurred in get_audio_info: {error_msg}")
        traceback.print_exc()
        
        # Check if it's a network-related error
        if "network" in error_msg.lower() or "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            detail = f"Network error while accessing YouTube. The server may be experiencing connectivity issues. Error: {error_msg}"
        else:
            detail = f"Internal server error processing request: {error_msg}"
            
        raise HTTPException(status_code=500, detail=detail)

def calculate_pitch_factor(target_hz: Optional[float], base_hz: float = 440.0) -> Optional[float]:
    if target_hz is None or target_hz <= 0 or base_hz <= 0:
        return None # No change
    return target_hz / base_hz

async def process_and_stream_audio_generator(audio_url: str, target_frequency: Optional[float], ai_preset: bool = False):
    ffmpeg_process = None
    temp_output_file = None # Not used anymore, pedalboard works in memory

    try:
        y_processed = None
        sample_rate = 44100 # Target sample rate

        pitch_factor = calculate_pitch_factor(target_frequency)
        apply_pitch_shift = pitch_factor is not None and abs(pitch_factor - 1.0) > 1e-4

        if ai_preset:
            # Step 1 (AI Preset): Use ffmpeg to apply AI echo and get PCM audio
            print(f"ffmpeg: Applying AI preset for {audio_url}")
            ffmpeg_command_parts = [
                'ffmpeg', '-i', audio_url,
                '-af', "aecho=0.8:0.9:500:0.3", # Simplified echo
                '-vn', '-acodec', 'pcm_s16le', '-ar', str(sample_rate), '-ac', '2', '-f', 'wav', '-'
            ]
            print(f"Executing ffmpeg command (AI preset): {' '.join(ffmpeg_command_parts)}")
            ffmpeg_process = await asyncio.create_subprocess_exec(
                *ffmpeg_command_parts,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_data, stderr_data = await ffmpeg_process.communicate()
            ffmpeg_stderr_str = stderr_data.decode(errors='ignore').strip()
            if ffmpeg_stderr_str:
                print(f"ffmpeg stderr (AI preset):\n{ffmpeg_stderr_str}")
            
            if ffmpeg_process.returncode != 0:
                raise HTTPException(status_code=500, detail=f"ffmpeg AI preset processing failed (code {ffmpeg_process.returncode})")
            if not stdout_data:
                raise HTTPException(status_code=500, detail="ffmpeg AI preset produced no output.")

            # Convert PCM data from ffmpeg to NumPy array
            with io.BytesIO(stdout_data) as pcm_buffer:
                y_audio, sr_orig = sf.read(pcm_buffer, dtype='float32')
            print(f"Soundfile: Read AI-preset audio. SR: {sr_orig}, Shape: {y_audio.shape}")
            if sr_orig != sample_rate:
                # This shouldn't happen if ffmpeg -ar is set correctly, but as a fallback
                print(f"Warning: Sample rate from ffmpeg AI step ({sr_orig}) doesn't match target ({sample_rate}). Resampling may be needed or quality affected.")
            
            y_processed = y_audio

        # Step 2: Apply Pitch Shifting with Pedalboard (if needed)
        # If AI preset was applied, y_processed is already populated.
        # If no AI preset, load audio directly.
        if apply_pitch_shift:
            if y_processed is None: # No AI preset, load audio directly for pitch shifting
                print(f"aiohttp/soundfile: Fetching and decoding for pitch shift: {audio_url}")
                async with aiohttp.ClientSession() as session:
                    async with session.get(audio_url) as response:
                        if response.status != 200:
                            raise HTTPException(status_code=response.status, detail=f"Failed to fetch audio for pitch shift: {audio_url}")
                        audio_bytes = await response.read()
                with io.BytesIO(audio_bytes) as audio_buffer:
                    y_audio, sr_orig = sf.read(audio_buffer, dtype='float32')
                print(f"Soundfile: Read direct audio. SR: {sr_orig}, Shape: {y_audio.shape}")
                # Note: Pedalboard will use its own sample_rate setting or the board's.
                # We ensure output sample rate with sf.write later.
                # For Pedalboard, it's best to process at original SR if possible, then resample output if needed.
                # However, our ffmpeg step standardizes to `sample_rate` (44100).
                # For consistency, if direct loading, Pedalboard should also aim for this.
                # For simplicity, pedalboard will use `sr_orig` and `sf.write` will handle final rate if different.
                y_processed = y_audio
                sample_rate = sr_orig # Use original sample rate for pedalboard processing if loaded directly

            print(f"Pedalboard: Applying pitch shift with factor: {pitch_factor} (Target SR for Pedalboard: {sample_rate})")
            
            # Pedalboard expects (num_channels, num_samples) or (num_samples,)
            # soundfile reads as (num_samples, num_channels)
            y_to_shift = y_processed.T if y_processed.ndim == 2 else y_processed
            
            board = Pedalboard([PitchShift(semitones=12 * math.log2(pitch_factor))], sample_rate=float(sample_rate))
            y_shifted_pb = board(y_to_shift, sample_rate=float(sample_rate)) # Process with specified sample rate
            
            y_processed = y_shifted_pb.T if y_shifted_pb.ndim == 2 else y_shifted_pb
            print("Pedalboard: Pitch shift applied.")

        # Step 3: Ensure audio is loaded if no AI and no Pitch Shift (just transcode to WAV)
        if y_processed is None:
            print(f"aiohttp/soundfile: Fetching and decoding for WAV conversion: {audio_url}")
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=response.status, detail=f"Failed to fetch audio for WAV conversion: {audio_url}")
                    audio_bytes = await response.read()
            with io.BytesIO(audio_bytes) as audio_buffer:
                y_processed, sr_orig = sf.read(audio_buffer, dtype='float32')
            print(f"Soundfile: Read direct audio for WAV. SR: {sr_orig}, Shape: {y_processed.shape}")
            sample_rate = sr_orig # Use original sample rate for writing

        # Step 4: Stream the processed audio (y_processed) as WAV
        if y_processed is None:
            raise HTTPException(status_code=500, detail="Audio processing resulted in no audio data.")

        # Ensure stereo output for sf.write
        if y_processed.ndim == 1:
            print("Processed audio is mono, converting to stereo for WAV output.")
            y_processed = np.stack((y_processed, y_processed), axis=-1)
        elif y_processed.ndim == 2 and y_processed.shape[1] == 1: # Mono but shape (N,1)
             print("Processed audio is mono (N,1), converting to stereo (N,2) for WAV output.")
             y_processed = np.concatenate((y_processed, y_processed), axis=1)


        print(f"Soundfile: Writing final audio to WAV stream. Target SR for sf.write: {sample_rate}")
        # Output WAV at 44.1kHz stereo, s16 PCM
        output_target_sr = 44100
        
        # Resample with Pedalboard if original/processing SR was different from final output SR
        # This step is crucial if sr_orig from direct load was used and is not 44100
        if sample_rate != output_target_sr:
            print(f"Pedalboard: Resampling from {sample_rate} Hz to {output_target_sr} Hz before encoding.")
            # Pedalboard resamples. board(audio_array, sample_rate_of_array)
            # To resample, we can pass it through an empty board or a board with Resample effect
            # For simplicity, let's use sf.write's capability if it's efficient enough or implement Resample effect
            # sf.write does not resample. We need to resample y_processed.
            resampler_board = Pedalboard([], sample_rate=float(sample_rate))
            y_processed_resampled = resampler_board.resample(y_processed, output_target_sr)
            y_to_write = y_processed_resampled
            final_sr_for_sf = output_target_sr
        else:
            y_to_write = y_processed
            final_sr_for_sf = sample_rate

        output_buffer = io.BytesIO()
        sf.write(output_buffer, y_to_write, samplerate=int(final_sr_for_sf), format='WAV', subtype='PCM_16')
        output_buffer.seek(0)
        
        chunk_size = 8192
        while True:
            chunk = output_buffer.read(chunk_size)
            if not chunk:
                break
            yield chunk
        print("Streaming processed audio completed.")

    except HTTPException: # Re-raise HTTPExceptions
        raise
    except Exception as e:
        print(f"Error during audio processing and streaming generator: {e}")
        traceback.print_exc()
        # Proper cleanup for ffmpeg if it was used
        if ffmpeg_process and ffmpeg_process.returncode is None:
            try:
                ffmpeg_process.terminate()
                await ffmpeg_process.wait(timeout=1.0)
            except ProcessLookupError: pass
            except asyncio.TimeoutError: ffmpeg_process.kill()
            except Exception as term_e: print(f"Error terminating ffmpeg: {term_e}")
        
        raise HTTPException(status_code=500, detail=f"Internal server error during audio processing: {str(e)}")
    finally:
        if ffmpeg_process and ffmpeg_process.returncode is None: # Ensure ffmpeg is cleaned up
            print("Terminating ffmpeg process in finally block (if generator error)...")
            try:
                ffmpeg_process.terminate()
                await ffmpeg_process.wait(timeout=1.0)
            except ProcessLookupError: pass # Process already finished
            except asyncio.TimeoutError:
                print("ffmpeg process did not terminate gracefully, killing.")
                ffmpeg_process.kill()
                await ffmpeg_process.wait()
            except Exception as e_finally:
                print(f"Error during ffmpeg cleanup in finally: {e_finally}")
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
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
