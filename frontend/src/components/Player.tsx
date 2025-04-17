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
    BoltIcon,
} from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import WaveformVisualizer from './WaveformVisualizer';
import ShareDialog from './ShareDialog';
import VolumeControl from './VolumeControl';
// TempoControl is not used directly here anymore, but keep import if needed elsewhere or for context
// import TempoControl from './TempoControl'; 
import PresetManager from './PresetManager';
import History from './History';
import FrequencySlider from './FrequencySlider'; // Import the new slider

interface AudioInfo {
    audio_stream_url: string;
    title: string;
    duration: number;
}

// Expanded list including Solfeggio frequencies, sorted
const ALL_FREQUENCIES = [
    { label: "Original", value: null },
    { label: "396 Hz (Ut)", value: 396 }, // Solfeggio
    { label: "417 Hz (Re)", value: 417 }, // Solfeggio
    { label: "432 Hz", value: 432 },
    { label: "440 Hz (Standard)", value: 440 },
    { label: "444 Hz", value: 444 },
    { label: "528 Hz (Mi)", value: 528 }, // Solfeggio
    { label: "639 Hz (Fa)", value: 639 }, // Solfeggio
    { label: "741 Hz (Sol)", value: 741 }, // Solfeggio
    { label: "852 Hz (La)", value: 852 }, // Solfeggio
    { label: "963 Hz (Si)", value: 963 }, // Solfeggio
];

const Player: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
    const [selectedFrequency, setSelectedFrequency] = useState<number | null>(ALL_FREQUENCIES[0].value); // Use the new list
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
    const tooltipTimeoutRef = useRef<number | null>(null);
    const [keyboardShortcuts, setKeyboardShortcuts] = useState(false);
    const [aiPresetActive, setAiPresetActive] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const revokeCurrentObjectUrl = () => {
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
            console.log("Revoked Object URL:", currentObjectUrlRef.current);
            currentObjectUrlRef.current = null;
        }
    };

    // Modify to accept optional URL argument
    const handleFetchAudioInfo = async (urlToFetch?: string) => {
        const url = urlToFetch || youtubeUrl; // Use passed URL or state
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

    // Manual audio processing function, call when user is ready to apply tuning
    const handleProcessAudio = async () => {
        if (!audioInfo) return;
        setIsProcessing(true);
        setError(null);
        revokeCurrentObjectUrl();
        setProcessedAudioUrl(null);
        try {
            const response = await fetch(`${backendUrl}/process_audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_stream_url: audioInfo.audio_stream_url,
                    target_frequency: selectedFrequency,
                    ai_preset: aiPresetActive,
                    playback_rate: tempo,
                }),
            });
            if (!response.ok) throw new Error((await response.json()).detail || `Status: ${response.status}`);
            const audioBlob = await response.blob();
            const objectUrl = URL.createObjectURL(audioBlob);
            currentObjectUrlRef.current = objectUrl;
            setProcessedAudioUrl(objectUrl);
        } catch (err: any) {
            setError(err.message || 'Failed to process audio.');
            revokeCurrentObjectUrl();
        } finally {
            setIsProcessing(false);
        }
    };

    // Automatically fetch processing when info loads once
    useEffect(() => {
        if (audioInfo) {
            handleProcessAudio();
        }
    }, [audioInfo]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedUrl = params.get('url');
        const sharedFreq = params.get('freq');
        
        if (sharedUrl) {
            setYoutubeUrl(sharedUrl);
            if (sharedFreq && sharedFreq !== 'original') {
                setSelectedFrequency(Number(sharedFreq));
            }
            handleFetchAudioInfo(sharedUrl); // Pass the shared URL here
        }
    }, []); // Dependencies are correct, no need to add handleFetchAudioInfo if wrapped in useCallback or stable

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
        if (tooltipTimeoutRef.current !== null) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        setShowTooltip(message);
        tooltipTimeoutRef.current = window.setTimeout(() => {
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

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = tempo;
        }
    }, [processedAudioUrl, tempo]);

    const applyAIPreset = () => {
        setAiPresetActive(true);
        setSelectedFrequency(528);
        setTempo(0.75);
        showTemporaryTooltip('Applying AI Magic preset...');
        handleFetchAudioInfo();
    };

    return (
        <div className="p-8 max-w-4xl mx-auto bg-gradient-to-br from-gray-800/60 via-gray-900/60 to-black/60 text-white rounded-2xl shadow-2xl ring-1 ring-indigo-600 space-y-8 relative overflow-hidden backdrop-blur-lg">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Enter YouTube URL"
                    className="flex-grow p-4 rounded-xl bg-gray-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-gray-600 transition-colors text-white placeholder-gray-400"
                    disabled={isLoading || isProcessing}
                />
                <button
                    onClick={() => handleFetchAudioInfo()} // Wrap in arrow function
                    disabled={isLoading || isProcessing}
                    className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 shadow-lg text-lg font-semibold"
                >
                    {isLoading ? 'Loading...' : 'Load Audio'}
                </button>
                <button
                    onClick={applyAIPreset}
                    disabled={isLoading || isProcessing}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                    <BoltIcon className="w-5 h-5 text-white" />
                    AI Magic
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-600 bg-opacity-25 border border-red-500 rounded-lg text-red-200 text-center shadow-inner">
                    {error}
                </div>
            )}

            {audioInfo && !isLoading && (
                <div className="mt-6 p-6 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl space-y-4 relative overflow-hidden ring-1 ring-indigo-600">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold truncate hover:text-clip">{audioInfo.title}</h3>
                            <p className="text-sm text-gray-400">
                                Duration: {Math.floor(audioInfo.duration / 60)}:{String(audioInfo.duration % 60).padStart(2, '0')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleShare}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Share"
                            >
                                <ShareIcon className="w-5 h-5 text-indigo-400" />
                            </button>
                            {processedAudioUrl && (
                                <button
                                    onClick={handleDownload}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5 text-indigo-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <FrequencySlider
                        availableFrequencies={ALL_FREQUENCIES}
                        selectedFrequency={selectedFrequency}
                        onChange={setSelectedFrequency}
                        disabled={isProcessing}
                    />
                    {/* Apply tuning only when ready */}
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handleProcessAudio}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isProcessing ? 'Processing...' : 'Apply Tuning'}
                        </button>
                    </div>

                    <div className="mt-4 relative group">
                        <WaveformVisualizer
                            audioUrl={processedAudioUrl}
                            isProcessing={isProcessing}
                            onTimeUpdate={setCurrentTime}
                            isPlaying={isPlaying}
                            onPlayPause={setIsPlaying}
                        />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-gray-800 to-transparent">
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
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
            {audioInfo && (
              <PresetManager currentFrequency={selectedFrequency} onSelect={(freq) => setSelectedFrequency(freq)} />
            )}
            <History onSelect={(url, freq) => { setYoutubeUrl(url); setSelectedFrequency(freq); handleFetchAudioInfo(url); }} /> 
        </div>
    );
};

export default Player;
