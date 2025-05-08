"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // No longer needed here
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, SlidersHorizontal, RotateCcw } from 'lucide-react'; // Added RotateCcw for Default
import { applyTheme, initializeTheme, getCurrentThemeValues } from '@/lib/theme-manager'; // Corrected path assuming components and lib are siblings under src

const SAMPLE_AUDIO_URL = 'https://www.mfiles.co.uk/mp3-downloads/gs-cd-track2.mp3'; // Sample audio

// Updated to include all Solfeggio frequencies and a Default
const PRESET_FREQUENCIES = [
  { label: "Default", value: "default" }, // Special value for default theme
  { label: "174 Hz", value: "174" },
  { label: "285 Hz", value: "285" },
  { label: "396 Hz", value: "396" },
  { label: "417 Hz", value: "417" },
  { label: "528 Hz", value: "528" },
  { label: "639 Hz", value: "639" },
  { label: "741 Hz", value: "741" },
  { label: "852 Hz", value: "852" },
  { label: "963 Hz", value: "963" },
];

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

// Helper to get computed CSS variables for WaveSurfer
const getWaveSurferThemeColors = () => {
  if (typeof window === 'undefined') {
    // Fallback for SSR or if styles not yet available
    const defaultTheme = getCurrentThemeValues('default');
    return {
      waveColor: defaultTheme['--theme-wave-color'] || 'rgba(148, 163, 184, 0.5)',
      progressColor: defaultTheme['--theme-wave-progress'] || 'rgba(56, 189, 248, 0.8)',
      cursorColor: defaultTheme['--theme-wave-cursor'] || 'rgba(34, 197, 94, 0.9)',
    };
  }
  const styles = getComputedStyle(document.documentElement);
  return {
    waveColor: styles.getPropertyValue('--theme-wave-color').trim() || 'rgba(148, 163, 184, 0.5)',
    progressColor: styles.getPropertyValue('--theme-wave-progress').trim() || 'rgba(56, 189, 248, 0.8)',
    cursorColor: styles.getPropertyValue('--theme-wave-cursor').trim() || 'rgba(34, 197, 94, 0.9)',
  };
};

const PlayerSection: React.FC = () => {
  // Default to "default" theme, which will be black as per theme-manager.js
  const [currentFrequency, setCurrentFrequency] = useState<number | "default">("default");
  const [selectedPresetValue, setSelectedPresetValue] = useState<string | undefined>(PRESET_FREQUENCIES[0].value);
  
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7); // Initial volume 0-1
  const [trackTitle, setTrackTitle] = useState("Loading Sample Audio..."); // Updated initial title
  const [trackDuration, setTrackDuration] = useState("--:--"); // Updated initial duration
  const [currentTime, setCurrentTime] = useState("0:00");

  useEffect(() => {
    // Initialize theme on mount
    initializeTheme(PRESET_FREQUENCIES[0].value); // Initialize with "default"
    
    // Ensure theme is applied before getting colors for WaveSurfer
    // requestAnimationFrame can help wait for next paint after style change
    requestAnimationFrame(() => {
        const initialWaveTheme = getWaveSurferThemeColors();
        if (waveformRef.current && !wavesurferRef.current) {
          const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: initialWaveTheme.waveColor,
            progressColor: initialWaveTheme.progressColor,
            barWidth: 3,
            barGap: 2,
            barRadius: 3,
            height: 90,
            cursorWidth: 2,
            cursorColor: initialWaveTheme.cursorColor,
            dragToSeek: true,
            normalize: true,
          });
          wavesurferRef.current = ws;

          ws.load(SAMPLE_AUDIO_URL);
          ws.on('ready', () => {
            setTrackTitle("Sample Audio: Greensleeves");
            setTrackDuration(formatTime(ws.getDuration()));
            ws.setVolume(volume);
          });
          ws.on('play', () => setIsPlaying(true));
          ws.on('pause', () => setIsPlaying(false));
          ws.on('finish', () => { setIsPlaying(false); ws.seekTo(0); });
          ws.on('timeupdate', (time) => setCurrentTime(formatTime(time)));
          ws.on('error', (err) => { console.error("WaveSurfer error:", err); setTrackTitle("Error loading sample"); });

          // No explicit destroy here, handle in return of outer useEffect
        }
    });
    return () => {
        wavesurferRef.current?.destroy();
        wavesurferRef.current = null; // Clear ref on unmount
    };
  }, []); // Runs once on mount

  useEffect(() => {
    wavesurferRef.current?.setVolume(volume);
  }, [volume]);

  // Update WaveSurfer colors when theme changes
  useEffect(() => {
    if (wavesurferRef.current) {
      // Ensure theme is applied by applyTheme before getting new colors
      requestAnimationFrame(() => {
        const newWaveTheme = getWaveSurferThemeColors();
        wavesurferRef.current?.setOptions({
          waveColor: newWaveTheme.waveColor,
          progressColor: newWaveTheme.progressColor,
          cursorColor: newWaveTheme.cursorColor,
        });
      });
    }
  }, [selectedPresetValue]); // Re-run when selectedPresetValue (and thus theme) changes

  const handleThemeChange = (newFreq: number | string) => {
    applyTheme(newFreq.toString());
    // setSelectedPresetValue will trigger the WaveSurfer theme update useEffect
  };

  const handleDialChange = (newFrequency: number | "default") => {
    setCurrentFrequency(newFrequency);
    const freqString = newFrequency.toString();
    const matchedPreset = PRESET_FREQUENCIES.find(p => p.value === freqString);
    setSelectedPresetValue(matchedPreset ? matchedPreset.value : PRESET_FREQUENCIES[0].value);
    handleThemeChange(newFrequency); 
  };

  const handlePresetChange = (value: string) => {
    if (value) {
      setSelectedPresetValue(value);
      if (value === "default") {
        setCurrentFrequency("default");
        handleThemeChange("default");
      } else {
        const newFreqNum = parseInt(value);
        setCurrentFrequency(newFreqNum);
        handleThemeChange(newFreqNum);
      }
    } else {
      // If value is empty (e.g., toggle group allows full deselection)
      // Revert to default theme and state
      setSelectedPresetValue(PRESET_FREQUENCIES[0].value);
      setCurrentFrequency("default");
      handleThemeChange("default");
    }
  };

  const handlePlayPause = () => wavesurferRef.current?.playPause();
  
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  // Function to determine if a preset is a "default" type for icon display
  const isDefaultPreset = (presetValue: string) => presetValue === "default";

  return (
    <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-50 site-header-title">{trackTitle}</h2>
          <p className="text-sm md:text-base text-neutral-400">Duration: {trackDuration}</p>
        </div>

        <div className="flex justify-center mb-6 md:mb-8">
          <CircularFrequencyDial 
            initialFrequency={currentFrequency === "default" ? 0 : currentFrequency}
            onFrequencyChange={handleDialChange} 
            size={240}
            frequencies={[...PRESET_FREQUENCIES.filter(f => f.value !== "default").map(f => Number(f.value)), 0]}
          />
        </div>

        <ToggleGroup 
          type="single" 
          variant="outline" 
          value={selectedPresetValue}
          onValueChange={handlePresetChange}
          className="flex justify-center flex-wrap gap-2 md:gap-3 mb-8 md:mb-10"
        >
          {PRESET_FREQUENCIES.map(preset => (
            <ToggleGroupItem 
              key={preset.value}
              value={preset.value} 
              aria-label={preset.label}
              className="px-3 py-2 text-xs sm:text-sm rounded-lg 
                         border-neutral-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800
                         data-[state=on]:bg-sky-500 data-[state=on]:text-white data-[state=on]:border-sky-400 data-[state=on]:shadow-lg"
            >
              {isDefaultPreset(preset.value) ? <RotateCcw className="w-4 h-4 mr-1 sm:mr-2" /> : null}
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Waveform Display Area */}
        <div id="waveform" ref={waveformRef} className="h-[90px] rounded-lg mb-6 md:mb-8 bg-neutral-700/30 cursor-pointer overflow-hidden"></div>

        <div className="flex items-center justify-between text-neutral-200 px-1 mb-4">
          <span className="text-sm font-mono w-14 text-left tabular-nums">{currentTime}</span>
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button onClick={handlePlayPause} variant="ghost" size="icon" className="text-neutral-200 hover:text-sky-300 rounded-full hover:bg-neutral-700/60 w-11 h-11 md:w-12 md:h-12 transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-neutral-200 hover:text-sky-300 rounded-full hover:bg-neutral-700/60 w-11 h-11 md:w-12 md:h-12 transition-colors">
              <SkipForward className="w-6 h-6" /> {/* TODO: Implement skip */}
            </Button>
          </div>
          <span className="text-sm font-mono w-14 text-right tabular-nums">{trackDuration}</span>
        </div>

        <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-3 w-full max-w-xs md:max-w-sm">
                <Volume2 className="w-5 h-5 text-neutral-300 flex-shrink-0"/>
                <Slider 
                    value={[volume * 100]}
                    max={100} 
                    step={1} 
                    onValueChange={handleVolumeChange}
                    className="[&>span:first-child>.relative]:h-[6px] 
                               [&>span:first-child>.relative>.absolute]:bg-sky-400 
                               [&>span:first-child>.relative]:bg-neutral-600 
                               [&_button[role=slider]]:bg-neutral-50 
                               [&_button[role=slider]]:w-3.5 [&_button[role=slider]]:h-3.5 
                               [&_button[role=slider]]:border-0 
                               [&_button[role=slider]]:shadow-lg 
                               [&_button[role=slider]]:focus-visible:ring-1 [&_button[role=slider]]:focus-visible:ring-sky-300 [&_button[role=slider]]:focus-visible:ring-offset-0"
                />
            </div>
            <Button variant="ghost" size="icon" className="text-neutral-300 hover:text-sky-300 rounded-full hover:bg-neutral-700/60 w-9 h-9 transition-colors">
                <SlidersHorizontal className="w-5 h-5" /> 
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerSection; 