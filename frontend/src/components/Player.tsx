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
    MusicalNoteIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import ShareDialog from './ShareDialog';
import FrequencySlider from './FrequencySlider';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AudioInfo {
    audio_stream_url: string;
    title: string;
    duration: number;
}

const ALL_FREQUENCIES = [
    { label: "Original", value: null },
    { label: "396 Hz (Ut)", value: 396 },
    { label: "417 Hz (Re)", value: 417 },
    { label: "432 Hz", value: 432 },
    { label: "440 Hz (Standard)", value: 440 },
    { label: "444 Hz", value: 444 },
    { label: "528 Hz (Mi)", value: 528 },
    { label: "639 Hz (Fa)", value: 639 },
    { label: "741 Hz (Sol)", value: 741 },
    { label: "852 Hz (La)", value: 852 },
    { label: "963 Hz (Si)", value: 963 },
];

const Player: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
    const [selectedFrequencyState, setSelectedFrequencyState] = useState<number | null>(ALL_FREQUENCIES[0].value);
    const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentObjectUrlRef = useRef<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [shareUrl, setShareUrl] = useState<string>('');
    const [sessionId] = useState(() => nanoid());
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);
    const [tempo, setTempo] = useState(1);
    const [aiPresetActive, setAiPresetActive] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const revokeCurrentObjectUrl = () => {
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
            console.log("Revoked Object URL:", currentObjectUrlRef.current);
            currentObjectUrlRef.current = null;
        }
    };

    const handleFetchAudioInfo = async (urlToFetch?: string) => {
        const urlToUse = urlToFetch || youtubeUrl;
        if (!urlToUse) {
            setError('Please enter a YouTube URL.');
            return;
        }
        revokeCurrentObjectUrl();
        setAudioInfo(null);
        setProcessedAudioUrl(null);
        setIsLoading(true);
        setIsProcessing(false);
        setError(null);
        setIsPlaying(false);

        try {
            const response = await fetch(`${backendUrl}/get_audio_info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlToUse }),
            });
            if (!response.ok) {
                const errorData: { detail?: string } = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const data: AudioInfo = await response.json();
            setAudioInfo(data);
            await handleProcessAudio(data.audio_stream_url, selectedFrequencyState, aiPresetActive, tempo);
        } catch (err: Error | unknown) {
            console.error("Error fetching audio info:", err);
            setError(err instanceof Error ? err.message : 'Failed to fetch audio info.');
        } finally {
            setIsLoading(false);
        }
    };

    const internalProcessAudio = async (audioStreamUrl: string, freq: number | null, ai: boolean, spd: number) => {
        setIsProcessing(true);
        setError(null);
        revokeCurrentObjectUrl();
        setProcessedAudioUrl(null);
        setIsPlaying(false);

        try {
            const response = await fetch(`${backendUrl}/process_audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_stream_url: audioStreamUrl,
                    target_frequency: freq,
                    ai_preset: ai,
                    playback_rate: spd,
                }),
            });
            if (!response.ok) {
                const errorData: { detail?: string } = await response.json();
                throw new Error(errorData.detail || `Status: ${response.status}`);
            }
            const audioBlob = await response.blob();
            const objectUrl = URL.createObjectURL(audioBlob);
            currentObjectUrlRef.current = objectUrl;
            setProcessedAudioUrl(objectUrl);
        } catch (err: Error | unknown) {
            setError(err instanceof Error ? err.message : 'Failed to process audio.');
            revokeCurrentObjectUrl();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessAudio = useCallback(internalProcessAudio, [backendUrl]);

    useEffect(() => {
        if (audioInfo && audioInfo.audio_stream_url && !isLoading && !isProcessing) {
            const processTimeout = setTimeout(() => {
                 handleProcessAudio(audioInfo.audio_stream_url, selectedFrequencyState, aiPresetActive, tempo);
            }, 300);
            return () => clearTimeout(processTimeout);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFrequencyState, tempo, aiPresetActive, audioInfo, isLoading, isProcessing, handleProcessAudio]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedUrl = params.get('url');
        const sharedFreq = params.get('freq');
        if (sharedUrl) {
            setYoutubeUrl(sharedUrl);
            if (sharedFreq && sharedFreq !== 'original') {
                setSelectedFrequencyState(Number(sharedFreq));
            }
        }
    }, []); 

    useEffect(() => {
        if (youtubeUrl && !audioInfo && !isLoading) {
            handleFetchAudioInfo(youtubeUrl);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [youtubeUrl]);

    const handleShare = () => {
        const params = new URLSearchParams({
            url: youtubeUrl,
            freq: selectedFrequencyState?.toString() || 'original',
        });
        const shareableUrl = `${window.location.origin}?${params.toString()}`;
        setShareUrl(shareableUrl);
        setShareDialogOpen(true);
    };

    const handleDownload = () => {
        if (!processedAudioUrl) return;
        const a = document.createElement('a');
        a.href = processedAudioUrl;
        a.download = `${audioInfo?.title || 'audio'}_${selectedFrequencyState || 'original'}Hz_tempo${tempo}x.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePlayPause = useCallback(() => {
        if (!audioRef.current || !processedAudioUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error('Playback failed:', err);
                setError('Playback failed. Please ensure audio is processed and playable.');
            });
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, processedAudioUrl]);

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
            handleVolumeChange(prevVolume || 1); 
        }
    }, [volume, prevVolume, handleVolumeChange]);

    const handleTempoChange = (newTempo: number) => {
        setTempo(newTempo);
    };

    const handleFrequencyChange = (newFrequency: number | null) => {
        setSelectedFrequencyState(newFrequency);
    };

    const handleSeek = (seekTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seekTime;
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);
        const handleAudioPlay = () => setIsPlaying(true);
        const handleAudioPause = () => setIsPlaying(false);
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration); 
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handleAudioPlay);
        audio.addEventListener('pause', handleAudioPause);
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handleAudioPlay);
            audio.removeEventListener('pause', handleAudioPause);
            revokeCurrentObjectUrl(); 
        };
    }, [processedAudioUrl]); 

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
                return; 
            }
            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); handlePlayPause(); break;
                case 'm': toggleMute(); break;
                case 'arrowleft': e.preventDefault(); handleSeek(-5); break;
                case 'arrowright': e.preventDefault(); handleSeek(5); break;
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handlePlayPause, toggleMute, handleSeek]);

    const formatTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <Card className="bg-apple-bg-secondary border-apple-border-primary text-apple-text-primary shadow-lg overflow-hidden">
            <CardHeader>
                <div className="space-y-1">
                    <label htmlFor="youtubeUrlPlayer" className="block text-xs font-medium text-apple-text-secondary">
                        YouTube Video URL
                    </label>
                    <div className="flex space-x-2">
                        <Input
                            id="youtubeUrlPlayer"
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="bg-apple-bg-tertiary border-apple-border-secondary text-apple-text-primary placeholder-apple-text-tertiary focus-visible:ring-apple-accent-blue text-sm"
                        />
                        <Button
                            variant="default_apple"
                            size="default"
                            onClick={() => handleFetchAudioInfo()}
                            disabled={isLoading || isProcessing || !youtubeUrl}
                        >
                            {isLoading || isProcessing ? 
                                (isLoading ? 'Loading...' : 'Tuning...') : 
                                'Load & Tune'
                            }
                        </Button>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4">
                {error && (
                    <div className="bg-apple-accent-red/20 text-apple-accent-red p-3 rounded-apple-sm text-sm border border-apple-accent-red/30">
                        Error: {error}
                    </div>
                )}

                {audioInfo && (
                    <div className="space-y-6">
                        <p className="text-lg font-semibold text-apple-text-primary truncate text-center" title={audioInfo.title}>
                            {audioInfo.title || 'Audio Track'}
                        </p>

                        <audio ref={audioRef} src={processedAudioUrl || undefined} className="hidden" />

                        <div className="space-y-1">
                            <Input 
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={(e) => { 
                                    if(audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                                    setCurrentTime(Number(e.target.value));
                                }}
                                disabled={!processedAudioUrl || isLoading || isProcessing}
                                className={`w-full h-2 appearance-none cursor-pointer rounded-apple-sm range-thumb-apple 
                                            ${!processedAudioUrl || isLoading || isProcessing ? 'bg-apple-bg-tertiary' : 'bg-apple-bg-tertiary'}`}
                                style={!processedAudioUrl || isLoading || isProcessing ? {} : {
                                    background: `linear-gradient(to right, var(--accent, #0A84FF) ${ (currentTime / (duration || 1)) * 100 }%, var(--secondary, #3A3A3C) ${ (currentTime / (duration || 1)) * 100 }%)` 
                                } as React.CSSProperties}
                                aria-label="Seek track"
                            />
                            <div className="flex justify-between text-xs text-apple-text-secondary">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-center sm:justify-between space-x-3 sm:space-x-4">
                            <Button 
                                variant="outline_apple"
                                size="icon_apple"
                                onClick={() => handleSeek(-10)} 
                                disabled={!processedAudioUrl || isLoading || isProcessing}
                                aria-label="Seek backward 10 seconds"
                                className="text-apple-text-primary hover:text-apple-accent-blue"
                            >
                                <BackwardIcon className="h-5 w-5" />
                            </Button>

                            <Button
                                variant="default_apple"
                                size="icon_apple"
                                onClick={handlePlayPause}
                                disabled={!processedAudioUrl || isLoading || isProcessing}
                                className="w-12 h-12 p-0 rounded-full text-white"
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                            </Button>

                            <Button 
                                variant="outline_apple"
                                size="icon_apple"
                                onClick={() => handleSeek(10)} 
                                disabled={!processedAudioUrl || isLoading || isProcessing}
                                aria-label="Seek forward 10 seconds"
                                className="text-apple-text-primary hover:text-apple-accent-blue"
                            >
                                <ForwardIcon className="h-5 w-5" />
                            </Button>

                            <div className="hidden sm:flex items-center space-x-2 flex-grow max-w-[150px]">
                                <Button 
                                    variant="outline_apple"
                                    size="icon_apple" 
                                    onClick={toggleMute} 
                                    aria-label={volume === 0 ? "Unmute" : "Mute"}
                                    className="text-apple-text-secondary hover:text-apple-text-primary"
                                >
                                    {volume === 0 ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                                </Button>
                                <Input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                                    className={`w-full h-1.5 rounded-apple-sm appearance-none cursor-pointer bg-apple-bg-tertiary range-thumb-apple-sm`}
                                    style={{
                                        background: `linear-gradient(to right, var(--secondary-foreground, #AEAEB2) ${volume * 100}%, var(--secondary, #3A3A3C) ${volume * 100}%)`
                                    } as React.CSSProperties}
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                        
                        <div className="sm:hidden flex items-center space-x-2 pt-3">
                             <Button 
                                variant="outline_apple" 
                                size="icon_apple" 
                                onClick={toggleMute} 
                                aria-label={volume === 0 ? "Unmute" : "Mute"}
                                className="text-apple-text-secondary hover:text-apple-text-primary"
                             >
                                {volume === 0 ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                            </Button>
                            <Input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} 
                                className={`w-full h-1.5 rounded-apple-sm appearance-none cursor-pointer bg-apple-bg-tertiary range-thumb-apple-sm`}
                                style={{background: `linear-gradient(to right, var(--secondary-foreground, #AEAEB2) ${volume * 100}%, var(--secondary, #3A3A3C) ${volume * 100}%)`} as React.CSSProperties}
                                aria-label="Volume"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-6 mt-4 border-t border-apple-border-primary">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-apple-text-secondary flex items-center">
                                    <MusicalNoteIcon className="w-4 h-4 mr-1.5 text-apple-text-tertiary" /> Frequency
                                </label>
                                <FrequencySlider 
                                    availableFrequencies={ALL_FREQUENCIES}
                                    selectedFrequency={selectedFrequencyState} 
                                    onChange={handleFrequencyChange} 
                                    disabled={isLoading || isProcessing}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-apple-text-secondary flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-1.5 text-apple-text-tertiary" /> Tempo: {tempo.toFixed(2)}x
                                </label>
                                <Input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.05"
                                    value={tempo}
                                    onChange={(e) => handleTempoChange(Number(e.target.value))}
                                    disabled={isLoading || isProcessing}
                                    className={`w-full h-1.5 rounded-apple-sm appearance-none cursor-pointer bg-apple-bg-tertiary range-thumb-apple-sm ${isLoading || isProcessing ? 'opacity-50' : ''}`}
                                    style={isLoading || isProcessing ? {} : {
                                        background: `linear-gradient(to right, var(--secondary-foreground, #AEAEB2) ${((tempo - 0.5) / 1.5) * 100}%, var(--secondary, #3A3A3C) ${((tempo - 0.5) / 1.5) * 100}%)`
                                    } as React.CSSProperties}
                                    aria-label="Tempo"
                                />
                            </div>
                            
                            <div className="md:col-span-2 flex items-center justify-center pt-2">
                                <Button
                                    variant={aiPresetActive ? "default_apple" : "outline_apple"}
                                    onClick={() => setAiPresetActive(!aiPresetActive)}
                                    disabled={isLoading || isProcessing}
                                    className={`px-4 py-2 text-sm rounded-apple-sm flex items-center gap-2 
                                                ${aiPresetActive 
                                                    ? 'bg-apple-accent-yellow text-black hover:bg-apple-accent-yellow/90 focus-visible:ring-apple-accent-yellow' 
                                                    : 'border-apple-accent-yellow/50 text-apple-accent-yellow hover:bg-apple-accent-yellow/10'
                                                }`}
                                >
                                    <BoltIcon className={`w-5 h-5 ${aiPresetActive ? 'text-black' : 'text-apple-accent-yellow'}`} />
                                    AI Magic Preset {aiPresetActive ? "On" : "Off"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-6 mt-4 border-t border-apple-border-primary">
                            <Button
                                variant="outline_apple"
                                size="icon_apple"
                                onClick={handleShare}
                                disabled={!youtubeUrl}
                                title="Share Track"
                                className="text-apple-text-secondary hover:text-apple-text-primary"
                            >
                                <ShareIcon className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline_apple"
                                size="icon_apple"
                                onClick={handleDownload}
                                disabled={!processedAudioUrl || isLoading || isProcessing}
                                title="Download Track"
                                className="text-apple-text-secondary hover:text-apple-text-primary"
                            >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {shareDialogOpen && (
            <ShareDialog
                isOpen={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                url={shareUrl}
                title={audioInfo?.title || 'Tuned Audio'}
                />
            )}

            {/* <style jsx global>{`
                .range-thumb-apple::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
                    background: #F5F5F7; border-radius: 50%; cursor: pointer;
                    border: 1px solid #545458; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .range-thumb-apple::-moz-range-thumb {
                    width: 18px; height: 18px; background: #F5F5F7; border-radius: 50%; 
                    cursor: pointer; border: 1px solid #545458; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .range-thumb-apple-sm::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
                    background: #F5F5F7; border-radius: 50%; cursor: pointer; border: 1px solid #545458;
                }
                .range-thumb-apple-sm::-moz-range-thumb {
                    width: 14px; height: 14px; background: #F5F5F7; border-radius: 50%; 
                    cursor: pointer; border: 1px solid #545458;
                }
            `}</style> */}
        </Card>
    );
};

export default Player;
