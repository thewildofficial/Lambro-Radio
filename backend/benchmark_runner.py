import asyncio
import aiohttp
import time
import json
import numpy as np
from typing import List, Dict, Any, Tuple

# --- Configuration ---
BASE_URL = "http://localhost:8000"  # Ensure your FastAPI server is running here
AUDIO_TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # A reasonably short audio for testing
DEFAULT_TARGET_FREQUENCY = 440.0 * (2**(4/12)) # Example: Tune A4 up by 4 semitones
CONCURRENCY_LEVELS = [1, 5, 10] # Number of concurrent users/requests
REQUESTS_PER_CONCURRENCY_LEVEL = 20 # Total requests to make for each concurrency level

# --- Helper Functions ---

async def fetch_get_audio_info(session: aiohttp.ClientSession, url: str) -> Tuple[Dict[str, Any] | None, float]:
    """Fetches audio info from the /get_audio_info endpoint."""
    start_time = time.perf_counter()
    payload = {"url": url}
    try:
        async with session.post(f"{BASE_URL}/get_audio_info", json=payload) as response:
            response_json = await response.json()
            end_time = time.perf_counter()
            latency = (end_time - start_time) * 1000  # milliseconds
            if response.status == 200 and response_json.get("audio_stream_url"):
                return response_json, latency
            else:
                print(f"Error in /get_audio_info: {response.status}, {response_json.get('detail')}")
                return None, latency
    except Exception as e:
        end_time = time.perf_counter()
        latency = (end_time - start_time) * 1000
        print(f"Exception in /get_audio_info: {e}")
        return None, latency

async def fetch_process_audio(
    session: aiohttp.ClientSession,
    audio_stream_url: str,
    target_frequency: float | None,
    ai_preset: bool
) -> Tuple[bool, float, int]:
    """Calls the /process_audio endpoint and consumes the stream."""
    start_time = time.perf_counter()
    payload = {
        "audio_stream_url": audio_stream_url,
        "target_frequency": target_frequency,
        "ai_preset": ai_preset
    }
    bytes_received = 0
    try:
        async with session.post(f"{BASE_URL}/process_audio", json=payload) as response:
            if response.status == 200:
                async for chunk in response.content.iter_chunked(8192):
                    bytes_received += len(chunk)
                end_time = time.perf_counter()
                latency = (end_time - start_time) * 1000  # milliseconds
                if bytes_received == 0:
                    print(f"Warning: /process_audio for {audio_stream_url} returned 0 bytes.")
                    # Try to get error detail if available
                    try:
                        error_detail = await response.json()
                        print(f"Error detail from server: {error_detail.get('detail')}")
                    except:
                        pass # Ignore if not json
                    return False, latency, bytes_received
                return True, latency, bytes_received
            else:
                error_detail = await response.text()
                end_time = time.perf_counter()
                latency = (end_time - start_time) * 1000
                print(f"Error in /process_audio: {response.status}, {error_detail}")
                return False, latency, bytes_received
    except Exception as e:
        end_time = time.perf_counter()
        latency = (end_time - start_time) * 1000
        print(f"Exception in /process_audio: {e}")
        return False, latency, bytes_received

async def run_benchmark_scenario(
    scenario_name: str,
    concurrency: int,
    total_requests: int,
    target_frequency: float | None,
    ai_preset: bool,
    use_process_audio: bool = True
) -> Dict[str, Any]:
    """Runs a specific benchmark scenario with concurrent requests."""
    print(f"\n--- Running Scenario: {scenario_name} | Concurrency: {concurrency} | Total Requests: {total_requests} ---")
    latencies: List[float] = []
    success_count = 0
    failure_count = 0
    bytes_transferred_list: List[int] = []

    async with aiohttp.ClientSession() as session:
        tasks = []
        
        # First, get audio_info for all requests if process_audio is used
        # This simulates a more realistic workflow where info is fetched before processing
        initial_audio_info = None
        if use_process_audio:
            print(f"Fetching initial audio_info for {AUDIO_TEST_URL}...")
            initial_audio_info, _ = await fetch_get_audio_info(session, AUDIO_TEST_URL)
            if not initial_audio_info:
                print(f"Critical: Could not get audio_info for {AUDIO_TEST_URL}. Aborting scenario.")
                return {
                    "scenario_name": scenario_name,
                    "concurrency": concurrency,
                    "total_requests": total_requests,
                    "successful_requests": 0,
                    "failed_requests": total_requests,
                    "avg_rps": 0,
                    "avg_latency_ms": 0,
                    "p50_latency_ms": 0,
                    "p90_latency_ms": 0,
                    "p99_latency_ms": 0,
                    "error_rate_percent": 100,
                    "avg_bytes_transferred": 0
                }
            print(f"Got audio_stream_url: {initial_audio_info['audio_stream_url']}")


        for _ in range(total_requests):
            if use_process_audio:
                if initial_audio_info and initial_audio_info.get("audio_stream_url"):
                    task = asyncio.ensure_future(fetch_process_audio(
                        session,
                        initial_audio_info["audio_stream_url"],
                        target_frequency,
                        ai_preset
                    ))
                else: # Should not happen due to check above, but as a safeguard
                    failure_count +=1
                    latencies.append(0) # Or some indicator of pre-failure
                    continue 
            else: # /get_audio_info scenario
                task = asyncio.ensure_future(fetch_get_audio_info(session, AUDIO_TEST_URL))
            tasks.append(task)

        start_run_time = time.perf_counter()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_run_time = time.perf_counter()
        
        total_run_duration = end_run_time - start_run_time

        for result in results:
            if isinstance(result, Exception):
                failure_count += 1
                # We don't have latency if an exception occurred before timing
            elif use_process_audio:
                success, latency, bytes_received = result
                latencies.append(latency)
                bytes_transferred_list.append(bytes_received)
                if success and bytes_received > 0 : # Ensure stream was not empty
                    success_count += 1
                else:
                    failure_count += 1
            else: # /get_audio_info
                info, latency = result
                latencies.append(latency)
                if info:
                    success_count += 1
                else:
                    failure_count += 1
    
    # Calculate statistics
    actual_completed_requests = success_count + failure_count
    avg_rps = actual_completed_requests / total_run_duration if total_run_duration > 0 else 0
    avg_latency_ms = np.mean(latencies) if latencies else 0
    p50_latency_ms = np.percentile(latencies, 50) if latencies else 0
    p90_latency_ms = np.percentile(latencies, 90) if latencies else 0
    p99_latency_ms = np.percentile(latencies, 99) if latencies else 0
    error_rate_percent = (failure_count / actual_completed_requests) * 100 if actual_completed_requests > 0 else 0
    avg_bytes_transferred = np.mean(bytes_transferred_list) if bytes_transferred_list else 0


    print(f"    Completed: {actual_completed_requests}, Success: {success_count}, Fail: {failure_count}")
    print(f"    Avg RPS: {avg_rps:.2f}")
    print(f"    Avg Latency: {avg_latency_ms:.2f} ms")
    print(f"    P50 Latency: {p50_latency_ms:.2f} ms")
    print(f"    P90 Latency: {p90_latency_ms:.2f} ms")
    print(f"    P99 Latency: {p99_latency_ms:.2f} ms")
    if use_process_audio:
        print(f"    Avg Bytes Transferred: {avg_bytes_transferred:.2f}")


    return {
        "scenario_name": scenario_name,
        "concurrency": concurrency,
        "total_requests": total_requests, # This is the attempted number
        "completed_requests": actual_completed_requests,
        "successful_requests": success_count,
        "failed_requests": failure_count,
        "avg_rps": avg_rps,
        "avg_latency_ms": avg_latency_ms,
        "p50_latency_ms": p50_latency_ms,
        "p90_latency_ms": p90_latency_ms,
        "p99_latency_ms": p99_latency_ms,
        "error_rate_percent": error_rate_percent,
        "avg_bytes_transferred": avg_bytes_transferred if use_process_audio else None
    }

async def main():
    all_results: List[Dict[str, Any]] = []

    # --- Scenario 1: /get_audio_info only ---
    for conc in CONCURRENCY_LEVELS:
        num_req = REQUESTS_PER_CONCURRENCY_LEVEL // conc # Adjust requests to keep total work somewhat similar
        if num_req == 0: num_req = 1 
        result = await run_benchmark_scenario(
            scenario_name="/get_audio_info",
            concurrency=conc,
            total_requests=num_req * conc, # Ensure it's a multiple of concurrency for easier batching
            target_frequency=None,
            ai_preset=False,
            use_process_audio=False
        )
        all_results.append(result)

    # --- Scenario 2: /process_audio (no pitch shift, no AI preset) ---
    for conc in CONCURRENCY_LEVELS:
        num_req = REQUESTS_PER_CONCURRENCY_LEVEL // conc
        if num_req == 0: num_req = 1
        result = await run_benchmark_scenario(
            scenario_name="/process_audio (baseline)",
            concurrency=conc,
            total_requests=num_req * conc,
            target_frequency=None,
            ai_preset=False
        )
        all_results.append(result)

    # --- Scenario 3: /process_audio (with pitch shift) ---
    for conc in CONCURRENCY_LEVELS:
        num_req = REQUESTS_PER_CONCURRENCY_LEVEL // conc
        if num_req == 0: num_req = 1
        result = await run_benchmark_scenario(
            scenario_name="/process_audio (pitch shift)",
            concurrency=conc,
            total_requests=num_req * conc,
            target_frequency=DEFAULT_TARGET_FREQUENCY,
            ai_preset=False
        )
        all_results.append(result)

    # --- Scenario 4: /process_audio (with AI preset) ---
    for conc in CONCURRENCY_LEVELS:
        num_req = REQUESTS_PER_CONCURRENCY_LEVEL // conc
        if num_req == 0: num_req = 1
        result = await run_benchmark_scenario(
            scenario_name="/process_audio (AI preset)",
            concurrency=conc,
            total_requests=num_req * conc,
            target_frequency=None,
            ai_preset=True
        )
        all_results.append(result)
    
    # --- Scenario 5: /process_audio (with pitch shift AND AI preset) ---
    for conc in CONCURRENCY_LEVELS:
        num_req = REQUESTS_PER_CONCURRENCY_LEVEL // conc
        if num_req == 0: num_req = 1
        result = await run_benchmark_scenario(
            scenario_name="/process_audio (pitch shift + AI preset)",
            concurrency=conc,
            total_requests=num_req * conc,
            target_frequency=DEFAULT_TARGET_FREQUENCY,
            ai_preset=True
        )
        all_results.append(result)

    # --- Generate Markdown Report ---
    print("\n\n--- Benchmark Results Summary ---")
    
    # Header
    report_md = "| Scenario                            | Concurrency | Total Req. | Completed | Success | Failed | Avg RPS | Avg Latency (ms) | P50 Latency (ms) | P90 Latency (ms) | P99 Latency (ms) | Error Rate (%) | Avg Bytes Recv. |\n"
    report_md += "|-------------------------------------|-------------|------------|-----------|---------|--------|---------|------------------|------------------|------------------|------------------|----------------|-----------------|\n"

    for res in all_results:
        report_md += (
            f"| {res['scenario_name']:<35} | "
            f"{res['concurrency']:<11} | "
            f"{res['total_requests']:<10} | "
            f"{res['completed_requests']:<9} | "
            f"{res['successful_requests']:<7} | "
            f"{res['failed_requests']:<6} | "
            f"{res['avg_rps']:.2f}       | " # Add padding if needed
            f"{res['avg_latency_ms']:.2f}            | "
            f"{res['p50_latency_ms']:.2f}            | "
            f"{res['p90_latency_ms']:.2f}            | "
            f"{res['p99_latency_ms']:.2f}            | "
            f"{res['error_rate_percent']:.2f}             | "
            f"{res['avg_bytes_transferred'] if res['avg_bytes_transferred'] is not None else 'N/A':<15} |\n"
        )
    
    print(report_md)

    with open("benchmark_report.md", "w") as f:
        f.write(report_md)
    print("\nReport also saved to benchmark_report.md")


if __name__ == "__main__":
    asyncio.run(main()) 