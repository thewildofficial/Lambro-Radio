'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShareIcon, ArrowDownTrayIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import WaveformVisualizer from './WaveformVisualizer';
import ShareDialog from './ShareDialog';

interface AudioInfo {
    audio_stream_url: string;
    title: string;
    duration: number;
}

const TARGET_FREQUENCIES = [
    { label: "Original (No Retune)", value: null },
    { label: "432 Hz", value: 432 },
    { label: "440 Hz (Standard)", value: 440 },
    { label: "444 Hz", value: 444 },
    { label: "528 Hz", value: 528 },
];

const Player: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
    const [selectedFrequency, setSelectedFrequency] = useState<number | null>(TARGET_FREQUENCIES[0].value);
    const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentObjectUrlRef = useRef<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');
    const [sessionId] = useState(() => nanoid());
    const [isPlaying, setIsPlaying] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const revokeCurrentObjectUrl = () => {
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
            console.log("Revoked Object URL:", currentObjectUrlRef.current);
            currentObjectUrlRef.current = null;
        }
    };

    const handleFetchAudioInfo = async () => {
        revokeCurrentObjectUrl();
        setAudioInfo(null);
        setProcessedAudioUrl(null);
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL.');
            return;
        }
        setIsLoading(true);
        setIsProcessing(false);
        setError(null);

        try {
            const response = await fetch(`${backendUrl}/get_audio_info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: youtubeUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data: AudioInfo = await response.json();
            setAudioInfo(data);

        } catch (err: any) {
            console.error("Error fetching audio info:", err);
            setError(err.message || 'Failed to fetch audio info.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let isCancelled = false;

        const fetchAndSetProcessedAudio = async () => {
            if (!audioInfo) {
                setProcessedAudioUrl(null);
                revokeCurrentObjectUrl();
                return;
            }

            setIsProcessing(true);
            setError(null);
            revokeCurrentObjectUrl();
            setProcessedAudioUrl(null);

            try {
                console.log("Requesting processed audio with freq:", selectedFrequency);
                const response = await fetch(`${backendUrl}/process_audio`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        audio_stream_url: audioInfo.audio_stream_url,
                        target_frequency: selectedFrequency,
                    }),
                });

                if (isCancelled) return;

                if (!response.ok) {
                    let errorDetail = `Processing error! status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorDetail = errorData.detail || errorDetail;
                    } catch (jsonError) {}
                    throw new Error(errorDetail);
                }

                const audioBlob = await response.blob();
                if (isCancelled) return;

                const objectUrl = URL.createObjectURL(audioBlob);
                if (isCancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }

                console.log("Created Object URL:", objectUrl);
                currentObjectUrlRef.current = objectUrl;
                setProcessedAudioUrl(objectUrl);

            } catch (err: any) {
                if (!isCancelled) {
                    console.error("Error processing audio:", err);
                    setError(err.message || 'Failed to process audio.');
                    setProcessedAudioUrl(null);
                    revokeCurrentObjectUrl();
                }
            } finally {
                if (!isCancelled) {
                    setIsProcessing(false);
                }
            }
        };

        fetchAndSetProcessedAudio();

        return () => {
            isCancelled = true;
            revokeCurrentObjectUrl();
            console.log("Cleanup effect ran");
        };
    }, [audioInfo, selectedFrequency, backendUrl]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedUrl = params.get('url');
        const sharedFreq = params.get('freq');
        
        if (sharedUrl) {
            setYoutubeUrl(sharedUrl);
            if (sharedFreq && sharedFreq !== 'original') {
                setSelectedFrequency(Number(sharedFreq));
            }
            handleFetchAudioInfo();
        }
    }, []);

    const handleShare = () => {
        const params = new URLSearchParams({
            url: youtubeUrl,
            freq: selectedFrequency?.toString() || 'original',
            session: sessionId
        });
        const shareableUrl = `${window.location.origin}?${params.toString()}`;
        setShareUrl(shareableUrl);
        setShareDialogOpen(true);
    };

    const handleDownload = () => {
        if (!processedAudioUrl) return;
        
        const a = document.createElement('a');
        a.href = processedAudioUrl;
        a.download = `${audioInfo?.title || 'audio'}_${selectedFrequency || 'original'}hz.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setIsPlaying(false);
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
        };
    }, [processedAudioUrl]);

    return (
        <div className="p-4 max-w-4xl mx-auto bg-gray-800 text-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                Lambro Radio
            </h2>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Enter YouTube URL"
                    className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    disabled={isLoading || isProcessing}
                />
                <button
                    onClick={handleFetchAudioInfo}
                    disabled={isLoading || isProcessing}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                    {isLoading ? 'Loading...' : 'Load Audio'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-center">
                    {error}
                </div>
            )}

            {audioInfo && !isLoading && (
                <div className="mt-6 p-6 bg-gray-700 rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold">{audioInfo.title}</h3>
                            <p className="text-sm text-gray-400">
                                Duration: {Math.floor(audioInfo.duration / 60)}:{String(audioInfo.duration % 60).padStart(2, '0')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleShare}
                                className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                                title="Share"
                            >
                                <ShareIcon className="w-5 h-5 text-indigo-400" />
                            </button>
                            {processedAudioUrl && (
                                <button
                                    onClick={handleDownload}
                                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5 text-indigo-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
                        <label htmlFor="frequency-select" className="text-sm font-medium whitespace-nowrap">
                            Retune A4 to:
                        </label>
                        <select
                            id="frequency-select"
                            value={selectedFrequency === null ? 'null' : String(selectedFrequency)}
                            onChange={(e) => setSelectedFrequency(e.target.value === 'null' ? null : Number(e.target.value))}
                            disabled={isProcessing}
                            className="flex-grow p-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-70 text-white"
                        >
                            {TARGET_FREQUENCIES.map(freq => (
                                <option key={freq.label} value={freq.value === null ? 'null' : String(freq.value)}>
                                    {freq.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4">
                        <WaveformVisualizer
                            audioUrl={processedAudioUrl}
                            isProcessing={isProcessing}
                            onTimeUpdate={setCurrentTime}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handlePlayPause}
                            disabled={!processedAudioUrl || isProcessing}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPlaying ? (
                                <PauseIcon className="w-6 h-6" />
                            ) : (
                                <PlayIcon className="w-6 h-6" />
                            )}
                        </button>

                        <div className="text-sm text-gray-400">
                            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(audioInfo.duration / 60)}:{String(audioInfo.duration % 60).padStart(2, '0')}
                        </div>
                    </div>

                    <audio
                        ref={audioRef}
                        src={processedAudioUrl || undefined}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}

            <ShareDialog
                isOpen={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                url={shareUrl}
                title={audioInfo?.title || ''}
            />
        </div>
    );
};

export default Player;
