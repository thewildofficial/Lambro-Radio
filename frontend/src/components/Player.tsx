'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ShareIcon,
    ArrowDownTrayIcon,
    PlayIcon,
    PauseIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    BackwardIcon,
    ForwardIcon,
} from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import WaveformVisualizer from './WaveformVisualizer';
import ShareDialog from './ShareDialog';
import VolumeControl from './VolumeControl';
import TempoControl from './TempoControl';

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
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);
    const [tempo, setTempo] = useState(1);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
    const [keyboardShortcuts, setKeyboardShortcuts] = useState(false);

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

    const handlePlayPause = useCallback(() => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error('Playback failed:', err);
                setError('Playback failed. Please try again.');
            });
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleVolumeChange = useCallback((newVolume: number) => {
        if (!audioRef.current) return;
        audioRef.current.volume = newVolume;
        setVolume(newVolume);
    }, []);

    const toggleMute = useCallback(() => {
        if (!audioRef.current) return;
        if (volume > 0) {
            setPrevVolume(volume);
            handleVolumeChange(0);
        } else {
            handleVolumeChange(prevVolume);
        }
    }, [volume, prevVolume, handleVolumeChange]);

    const handleTempoChange = useCallback((newTempo: number) => {
        if (!audioRef.current) return;
        audioRef.current.playbackRate = newTempo;
        setTempo(newTempo);
    }, []);

    const showTemporaryTooltip = useCallback((message: string) => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        setShowTooltip(message);
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(null);
        }, 2000);
    }, []);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!audioRef.current || isProcessing) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    handlePlayPause();
                    showTemporaryTooltip(isPlaying ? 'Paused' : 'Playing');
                    break;
                case 'm':
                    toggleMute();
                    showTemporaryTooltip(volume > 0 ? 'Muted' : 'Unmuted');
                    break;
                case 'arrowup':
                    e.preventDefault();
                    handleVolumeChange(Math.min(1, volume + 0.1));
                    showTemporaryTooltip(`Volume: ${Math.round(volume * 100)}%`);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 0.1));
                    showTemporaryTooltip(`Volume: ${Math.round(volume * 100)}%`);
                    break;
                case '[':
                    handleTempoChange(Math.max(0.5, tempo - 0.1));
                    showTemporaryTooltip(`Speed: ${tempo.toFixed(1)}x`);
                    break;
                case ']':
                    handleTempoChange(Math.min(2, tempo + 0.1));
                    showTemporaryTooltip(`Speed: ${tempo.toFixed(1)}x`);
                    break;
                case '?':
                    setKeyboardShortcuts(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handlePlayPause, handleVolumeChange, handleTempoChange, isPlaying, volume, tempo, isProcessing, toggleMute, showTemporaryTooltip]);

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
        <div className="p-4 max-w-4xl mx-auto bg-gray-800 text-white rounded-lg shadow-lg space-y-6 relative">
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
                <div className="mt-6 p-6 bg-gray-700 rounded-lg space-y-4 relative overflow-hidden group">
                    <div className="flex items-start justify-between group-hover:opacity-100 transition-opacity">
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold truncate hover:text-clip">{audioInfo.title}</h3>
                            <p className="text-sm text-gray-400">
                                Duration: {Math.floor(audioInfo.duration / 60)}:{String(audioInfo.duration % 60).padStart(2, '0')}
                            </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg transition-all hover:shadow-lg">
                        <label htmlFor="frequency-select" className="text-sm font-medium whitespace-nowrap">
                            Retune A4 to:
                        </label>
                        <select
                            id="frequency-select"
                            value={selectedFrequency === null ? 'null' : String(selectedFrequency)}
                            onChange={(e) => setSelectedFrequency(e.target.value === 'null' ? null : Number(e.target.value))}
                            disabled={isProcessing}
                            className="flex-grow p-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-70 text-white transition-all hover:border-indigo-400"
                        >
                            {TARGET_FREQUENCIES.map(freq => (
                                <option key={freq.label} value={freq.value === null ? 'null' : String(freq.value)}>
                                    {freq.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4 relative group">
                        <WaveformVisualizer
                            audioUrl={processedAudioUrl}
                            isProcessing={isProcessing}
                            onTimeUpdate={setCurrentTime}
                            isPlaying={isPlaying}
                            onPlayPause={setIsPlaying}
                        />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-gray-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePlayPause}
                                    disabled={!processedAudioUrl || isProcessing}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                                >
                                    {isPlaying ? (
                                        <PauseIcon className="w-6 h-6" />
                                    ) : (
                                        <PlayIcon className="w-6 h-6" />
                                    )}
                                </button>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTempoChange(Math.max(0.5, tempo - 0.1))}
                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <BackwardIcon className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium">{tempo.toFixed(1)}x</span>
                                    <button
                                        onClick={() => handleTempoChange(Math.min(2, tempo + 0.1))}
                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ForwardIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleMute}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    {volume === 0 ? (
                                        <SpeakerXMarkIcon className="w-5 h-5" />
                                    ) : (
                                        <SpeakerWaveIcon className="w-5 h-5" />
                                    )}
                                </button>
                                <VolumeControl
                                    volume={volume}
                                    onChange={handleVolumeChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-gray-400 text-center transition-all hover:text-indigo-400">
                        {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(audioInfo.duration / 60)}:{String(audioInfo.duration % 60).padStart(2, '0')}
                    </div>

                    <audio
                        ref={audioRef}
                        src={processedAudioUrl || undefined}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}

            {showTooltip && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up">
                    {showTooltip}
                </div>
            )}

            {keyboardShortcuts && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
                        <h3 className="text-xl font-semibold">Keyboard Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Space</div><div>Play/Pause</div>
                            <div>M</div><div>Mute/Unmute</div>
                            <div>↑/↓</div><div>Volume</div>
                            <div>[/]</div><div>Adjust Speed</div>
                            <div>←/→</div><div>Seek 5s</div>
                            <div>?</div><div>Show/Hide Shortcuts</div>
                        </div>
                        <button
                            onClick={() => setKeyboardShortcuts(false)}
                            className="w-full mt-4 p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
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
