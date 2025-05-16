'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformVisualizerProps {
    audioUrl: string | null;
    isProcessing?: boolean;
    onReady?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    onPlayPause?: (isPlaying: boolean) => void;
    height?: number;
    isPlaying?: boolean;
}

const WaveformVisualizer = ({
    audioUrl,
    isProcessing = false,
    onReady,
    onTimeUpdate,
    onPlayPause,
    height = 90,
    isPlaying = false
}: WaveformVisualizerProps) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Refs for callback props to keep initializeWaveSurfer stable
    const onReadyRef = useRef(onReady);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPlayPauseRef = useRef(onPlayPause);

    // Update refs when callback props change
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
        onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    useEffect(() => {
        onPlayPauseRef.current = onPlayPause;
    }, [onPlayPause]);

    const initializeWaveSurfer = useCallback(() => {
        if (!waveformRef.current) return;
        console.log('WaveformVisualizer: initializeWaveSurfer called with new sleek styling');

        // Sleek, Apple-like styling
        const sleekWaveColor = 'rgba(255, 255, 255, 0.25)'; // Translucent white for unplayed bars
        const sleekProgressColor = 'rgba(255, 255, 255, 0.9)'; // Near-opaque white for played bars
        const sleekCursorColor = 'rgba(255, 255, 255, 0.75)'; // Distinct white for the cursor

        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            height,
            waveColor: sleekWaveColor,
            progressColor: sleekProgressColor,
            cursorColor: sleekCursorColor,
            barWidth: 2,       // Thin, but visible bars
            barGap: 2,         // Decent spacing between bars
            barRadius: 2,      // Slight rounding for a softer look
            backend: 'WebAudio',
            normalize: true,
            interact: true,
            fillParent: true,
        });

        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
            console.log('WaveformVisualizer: Wavesurfer ready event fired');
            setIsLoading(false);
            onReadyRef.current?.();
        });

        wavesurfer.on('audioprocess', (currentTime: number) => {
            onTimeUpdateRef.current?.(currentTime);
        });

        wavesurfer.on('play', () => {
            console.log('WaveformVisualizer: WaveSurfer "play" event fired.');
            onPlayPauseRef.current?.(true);
        });

        wavesurfer.on('pause', () => {
            console.log('WaveformVisualizer: WaveSurfer "pause" event fired.');
            onPlayPauseRef.current?.(false);
        });

        wavesurfer.on('error', (err: Error) => {
            console.error('WaveformVisualizer: WaveSurfer internal error:', err);
        });
        
        return wavesurfer;
    }, [height]);

    // Initialize WaveSurfer on component mount
    useEffect(() => {
        console.log('WaveformVisualizer: Mount effect: Initializing WaveSurfer instance.');
        const wavesurfer = initializeWaveSurfer();
        return () => {
            console.log('WaveformVisualizer: Unmount effect: Destroying WaveSurfer instance.');
            wavesurfer?.destroy();
            wavesurferRef.current = null;
        };
    }, [initializeWaveSurfer]);

    // Load audio when URL changes
    useEffect(() => {
        if (!wavesurferRef.current || !audioUrl) {
            if (wavesurferRef.current && !audioUrl) {
                 console.log('WaveformVisualizer: useEffect [audioUrl] - No audioUrl, but instance exists. Current state isPlaying:', wavesurferRef.current.isPlaying());
            }
            console.log('WaveformVisualizer: useEffect [audioUrl] - Bailing: no wavesurferRef.current or no audioUrl. audioUrl:', audioUrl);
            return;
        }

        console.log('WaveformVisualizer: useEffect [audioUrl] triggered. Current audioUrl:', audioUrl, 'isLoading:', isLoading);
        setIsLoading(true);
        
        if (waveformRef.current) {
            const rect = waveformRef.current.getBoundingClientRect();
            console.log('WaveformVisualizer: Container dimensions before load', {
                width: rect.width,
                height: rect.height
            });
        }
        
        wavesurferRef.current.load(audioUrl);
    }, [audioUrl]);

    // Control playback state based on isPlaying prop
    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer) {
            console.log('WaveformVisualizer: useEffect [isPlaying] - No wavesurfer instance.');
            return;
        }

        console.log('WaveformVisualizer: useEffect [isPlaying] triggered. Prop isPlaying:', isPlaying, 'Actual wavesurfer.isPlaying():', wavesurfer.isPlaying(), 'audioUrl:', audioUrl, 'isLoading:', isLoading);

        if (isPlaying && !wavesurfer.isPlaying()) {
            if (wavesurfer.getDuration() > 0) {
                 console.log('WaveformVisualizer: Calling wavesurfer.play()');
                wavesurfer.play();
                 console.log('WaveformVisualizer: After wavesurfer.play(), wavesurfer.isPlaying():', wavesurfer.isPlaying());
            } else {
                console.log('WaveformVisualizer: Play called, but audio not ready (duration 0 or not loaded).');
            }
        } else if (!isPlaying && wavesurfer.isPlaying()) {
            console.log('WaveformVisualizer: Calling wavesurfer.pause()');
            wavesurfer.pause();
            console.log('WaveformVisualizer: After wavesurfer.pause(), wavesurfer.isPlaying():', wavesurfer.isPlaying());
        }
    }, [isPlaying, audioUrl, isLoading]);

    return (
        <div className="relative w-full">
            <div
                ref={waveformRef}
                className={`w-full transition-opacity duration-300 ${
                    isProcessing || isLoading ? 'opacity-50' : 'opacity-100'
                }`}
                style={{ minHeight: `${height}px` }}
            />
            {(isProcessing || isLoading) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
};

export default WaveformVisualizer;