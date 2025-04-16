'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformVisualizerProps {
    audioUrl: string | null;
    isProcessing: boolean;
    onReady?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    onPlayPause?: (isPlaying: boolean) => void;
    height?: number;
    isPlaying?: boolean;
}

const WaveformVisualizer = ({
    audioUrl,
    isProcessing,
    onReady,
    onTimeUpdate,
    onPlayPause,
    height = 128,
    isPlaying = false
}: WaveformVisualizerProps) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);

    const initializeWaveSurfer = useCallback(() => {
        if (!waveformRef.current) return;

        const gradient = document.createElement('canvas').getContext('2d')!;
        const gradientHeight = 128;
        const gradient1 = gradient.createLinearGradient(0, 0, 0, gradientHeight);
        gradient1.addColorStop(0, 'rgba(79, 70, 229, 0.8)');  // indigo-600
        gradient1.addColorStop(1, 'rgba(99, 102, 241, 0.3)'); // indigo-500

        const gradient2 = gradient.createLinearGradient(0, 0, 0, gradientHeight);
        gradient2.addColorStop(0, 'rgba(129, 140, 248, 0.8)'); // indigo-400
        gradient2.addColorStop(1, 'rgba(165, 180, 252, 0.3)'); // indigo-300

        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            height,
            waveColor: gradient1,
            progressColor: gradient2,
            cursorColor: '#818cf8',
            barWidth: 2,
            barGap: 1,
            barRadius: 3,
            responsive: true,
            normalize: true,
            interact: true,
            fadeIn: true,
        });

        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
            setIsLoading(false);
            onReady?.();
        });

        wavesurfer.on('audioprocess', (currentTime: number) => {
            onTimeUpdate?.(currentTime);
        });

        wavesurfer.on('seek', (progress: number) => {
            setCurrentProgress(progress);
        });

        wavesurfer.on('play', () => {
            onPlayPause?.(true);
        });

        wavesurfer.on('pause', () => {
            onPlayPause?.(false);
        });

        return wavesurfer;
    }, [height, onReady, onTimeUpdate, onPlayPause]);

    useEffect(() => {
        const wavesurfer = initializeWaveSurfer();
        return () => {
            wavesurfer?.destroy();
        };
    }, [initializeWaveSurfer]);

    useEffect(() => {
        if (!wavesurferRef.current || !audioUrl) return;

        setIsLoading(true);
        wavesurferRef.current.load(audioUrl);
    }, [audioUrl]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer) return;

        if (isPlaying) {
            wavesurfer.play();
        } else {
            wavesurfer.pause();
        }
    }, [isPlaying]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const wavesurfer = wavesurferRef.current;
            if (!wavesurfer) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (wavesurfer.isPlaying()) {
                        wavesurfer.pause();
                    } else {
                        wavesurfer.play();
                    }
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    const currentTime = wavesurfer.getCurrentTime();
                    wavesurfer.setTime(Math.max(0, currentTime - 5));
                    break;
                case 'arrowright':
                    e.preventDefault();
                    const newTime = wavesurfer.getCurrentTime() + 5;
                    if (newTime <= wavesurfer.getDuration()) {
                        wavesurfer.setTime(newTime);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    return (
        <div className="relative w-full">
            <div
                ref={waveformRef}
                className={`transition-all duration-500 ease-in-out ${
                    isProcessing || isLoading ? 'opacity-50 scale-98' : 'opacity-100 scale-100'
                }`}
            />
            {(isProcessing || isLoading) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-1 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin-reverse" />
                        </div>
                        <span className="text-sm text-indigo-500 font-medium animate-pulse">
                            {isProcessing ? 'Processing Audio...' : 'Loading Waveform...'}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Time markers */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-gray-400">
                <span>{formatTime(currentProgress * (wavesurferRef.current?.getDuration() || 0))}</span>
                <span>{formatTime(wavesurferRef.current?.getDuration() || 0)}</span>
            </div>
        </div>
    );
};

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default WaveformVisualizer;