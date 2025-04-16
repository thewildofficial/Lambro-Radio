'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformVisualizerProps {
    audioUrl: string | null;
    isProcessing: boolean;
    onReady?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    height?: number;
}

const WaveformVisualizer = ({
    audioUrl,
    isProcessing,
    onReady,
    onTimeUpdate,
    height = 128
}: WaveformVisualizerProps) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!waveformRef.current) return;

        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            height,
            waveColor: '#4f46e5',
            progressColor: '#818cf8',
            cursorColor: '#6366f1',
            barWidth: 2,
            barGap: 1,
            barRadius: 3,
            responsive: true,
            normalize: true,
            interact: true,
        });

        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
            setIsLoading(false);
            onReady?.();
        });

        wavesurfer.on('audioprocess', (currentTime: number) => {
            onTimeUpdate?.(currentTime);
        });

        return () => {
            wavesurfer.destroy();
        };
    }, [height, onReady, onTimeUpdate]);

    useEffect(() => {
        if (!wavesurferRef.current || !audioUrl) return;

        setIsLoading(true);
        wavesurferRef.current.load(audioUrl);
    }, [audioUrl]);

    return (
        <div className="relative w-full">
            <div
                ref={waveformRef}
                className={`transition-opacity duration-300 ${
                    isProcessing || isLoading ? 'opacity-50' : 'opacity-100'
                }`}
            />
            {(isProcessing || isLoading) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-indigo-500 font-medium">
                            {isProcessing ? 'Processing Audio...' : 'Loading Waveform...'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaveformVisualizer;