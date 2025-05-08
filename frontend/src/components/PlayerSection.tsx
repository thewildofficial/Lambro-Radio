"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // No longer needed here
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, SlidersHorizontal, RotateCcw } from 'lucide-react'; // Added RotateCcw for Default
import { applyTheme, initializeTheme, getCurrentThemeValues } from '@/lib/theme-manager'; // Corrected path assuming components and lib are siblings under src
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel"; // Added Carousel imports

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
  const [currentFrequency, setCurrentFrequency] = useState<number | "default">("default");
  const [selectedPresetValue, setSelectedPresetValue] = useState<string | undefined>(PRESET_FREQUENCIES[0].value);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const [activeItemStyle, setActiveItemStyle] = useState<React.CSSProperties>({}); // For dynamic button color
  
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [trackTitle, setTrackTitle] = useState("Loading Sample Audio...");
  const [trackDuration, setTrackDuration] = useState("--:--");
  const [currentTime, setCurrentTime] = useState("0:00");

  const handleThemeChange = useCallback((newFreq: number | string) => {
    applyTheme(newFreq.toString());
  }, []);

  const handlePresetChange = useCallback((value: string) => {
    setSelectedPresetValue(prevSelectedPresetValue => {
      if (value && value !== prevSelectedPresetValue) {
        if (value === "default") {
          setCurrentFrequency("default");
          handleThemeChange("default");
        } else {
          const newFreqNum = parseInt(value);
          setCurrentFrequency(newFreqNum);
          handleThemeChange(newFreqNum);
        }
        return value;
      }
      return prevSelectedPresetValue;
    });
  }, [handleThemeChange]);

  const handleDialChange = useCallback((newFrequency: number | "default") => {
    setCurrentFrequency(newFrequency); // Update internal current frequency for the dial display
    const freqString = newFrequency.toString();
    const matchedPreset = PRESET_FREQUENCIES.find(p => p.value === freqString);
    const newSelectedValue = matchedPreset ? matchedPreset.value : PRESET_FREQUENCIES[0].value;

    // This will trigger a theme change IF the preset value actually changes
    // setSelectedPresetValue will also trigger the effect for activeItemStyle
    // handlePresetChange will ensure setCurrentFrequency and handleThemeChange are called if the preset value changes
    if (newSelectedValue !== selectedPresetValue) {
        handlePresetChange(newSelectedValue);
    } else {
        // If the dial moves but results in the same preset, ensure theme is current
        // This can happen if the dial is between snap points but closer to the current one
        // or if the dial explicitly sets a frequency that matches the current preset but wasn't the *exact* previous numeric value.
        handleThemeChange(newFrequency); 
    }
  }, [selectedPresetValue, handlePresetChange, handleThemeChange]);

  useEffect(() => {
    // Initialize theme and active item style on mount
    const initialPresetValue = PRESET_FREQUENCIES[0].value;
    initializeTheme(initialPresetValue); 
    requestAnimationFrame(() => {
        const initialWaveTheme = getWaveSurferThemeColors();
        if (typeof window !== 'undefined') {
            const styles = getComputedStyle(document.documentElement);
            const accentColor = styles.getPropertyValue('--theme-accent')?.trim();
            const accentForegroundColor = styles.getPropertyValue('--theme-accent-foreground')?.trim();
            setActiveItemStyle({ 
                backgroundColor: accentColor || 'rgb(147 51 234)', 
                color: accentForegroundColor || 'white' 
            });
        }
        if (waveformRef.current && !wavesurferRef.current) {
          const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: initialWaveTheme.waveColor, progressColor: initialWaveTheme.progressColor, barWidth: 3, barGap: 2, barRadius: 3, height: 90,
            cursorWidth: 2, cursorColor: initialWaveTheme.cursorColor, dragToSeek: true, normalize: true,
          });
          wavesurferRef.current = ws;
          ws.load(SAMPLE_AUDIO_URL);
          ws.on('ready', () => { setTrackTitle("Sample Audio: Greensleeves"); setTrackDuration(formatTime(ws.getDuration())); ws.setVolume(volume); });
          ws.on('play', () => setIsPlaying(true)); ws.on('pause', () => setIsPlaying(false)); ws.on('finish', () => { setIsPlaying(false); ws.seekTo(0); });
          ws.on('timeupdate', (time) => setCurrentTime(formatTime(time)));
          ws.on('error', (err) => { console.error("WaveSurfer error:", err); setTrackTitle("Error loading sample"); });
        }
    });
    return () => { wavesurferRef.current?.destroy(); wavesurferRef.current = null; };
  }, [volume]); // volume is a dependency for ws.setVolume, but this effect is mount only. Initial volume is fine.
               // For activeItemStyle on mount, it uses the initialized theme. Better to put style update in selectedPresetValue effect.

  useEffect(() => { wavesurferRef.current?.setVolume(volume); }, [volume]);

  // Update WaveSurfer colors AND active carousel item style when theme changes (due to selectedPresetValue)
  useEffect(() => {
    // Theme is already applied by handlePresetChange -> handleThemeChange
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => { 
        const newWaveTheme = getWaveSurferThemeColors();
        wavesurferRef.current?.setOptions({
          waveColor: newWaveTheme.waveColor, progressColor: newWaveTheme.progressColor, cursorColor: newWaveTheme.cursorColor,
        });
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--theme-accent')?.trim();
        const accentForegroundColor = styles.getPropertyValue('--theme-accent-foreground')?.trim();
        setActiveItemStyle({ 
          backgroundColor: accentColor || 'rgb(147 51 234)', 
          color: accentForegroundColor || 'white'
        });
      });
    }
  }, [selectedPresetValue]);

  // Effect to scroll carousel when selectedPresetValue changes
  useEffect(() => {
    if (carouselApi && selectedPresetValue) {
      const selectedIndex = PRESET_FREQUENCIES.findIndex(p => p.value === selectedPresetValue);
      if (selectedIndex !== -1 && selectedIndex !== carouselApi.selectedScrollSnap()) {
        carouselApi.scrollTo(selectedIndex);
      }
    }
  }, [selectedPresetValue, carouselApi]);

  // Effect to handle carousel api initialization and selection changes via arrows
  useEffect(() => {
    if (!carouselApi) return;
    const handleCarouselSelect = () => {
      const currentSelectedIndex = carouselApi.selectedScrollSnap();
      const newSelectedPreset = PRESET_FREQUENCIES[currentSelectedIndex];
      if (newSelectedPreset && newSelectedPreset.value !== selectedPresetValue) {
        handlePresetChange(newSelectedPreset.value); 
      }
    };
    carouselApi.on("select", handleCarouselSelect);
    return () => { carouselApi.off("select", handleCarouselSelect); };
  }, [carouselApi, handlePresetChange, selectedPresetValue]);

  const handlePlayPause = () => wavesurferRef.current?.playPause();
  const handleVolumeChange = (value: number[]) => { setVolume(value[0] / 100); };
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
            initialFrequency={currentFrequency} // Pass currentFrequency directly
            onFrequencyChange={handleDialChange} 
            size={240}
            frequencies={[...PRESET_FREQUENCIES.filter(f => f.value !== "default").map(f => Number(f.value)), 0]}
          />
        </div>

        {/* Carousel for Frequency Selection - Wrapper for padding and relative positioning */}
        <div className="relative mb-8 md:mb-10 px-8 sm:px-10 md:px-12"> 
          <Carousel 
            setApi={setCarouselApi}
            opts={{ align: "start", loop: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-1 sm:-ml-2"> 
              {PRESET_FREQUENCIES.map((preset) => (
                <CarouselItem key={preset.value} className="pl-1 sm:pl-2 basis-auto sm:basis-1/3 md:basis-1/4 lg:basis-1/5 flex-grow-0 flex-shrink-0">
                  <div className="p-1">
                    <Button
                      variant={"outline"} 
                      onClick={() => handlePresetChange(preset.value)}
                      className={`w-full h-auto py-3 px-2 text-xs sm:text-sm rounded-lg transition-all duration-200 ease-out
                                  border 
                                  ${selectedPresetValue === preset.value 
                                    ? 'border-transparent shadow-lg scale-105' 
                                    : 'bg-neutral-700/50 hover:bg-neutral-600/70 border-neutral-600/80 text-neutral-200 hover:text-neutral-50'}
                                  focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800`}
                      aria-label={preset.label}
                      style={selectedPresetValue === preset.value ? activeItemStyle : {}}
                    >
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {isDefaultPreset(preset.value) && (
                          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                        )}
                        <span>{preset.label}</span>
                      </div>
                    </Button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Arrows positioned slightly inside the padded container */}
            <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 z-10 
                                       bg-neutral-700/60 hover:bg-neutral-600/90 border-0 text-neutral-100 hover:text-white
                                       disabled:opacity-30 disabled:pointer-events-none rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center" />
            <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 z-10
                                     bg-neutral-700/60 hover:bg-neutral-600/90 border-0 text-neutral-100 hover:text-white
                                     disabled:opacity-30 disabled:pointer-events-none rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center" />
          </Carousel>
        </div>
        
        <div id="waveform" ref={waveformRef} className="h-[90px] rounded-lg mb-6 md:mb-8 bg-neutral-700/30 cursor-pointer overflow-hidden"></div>

        <div className="flex items-center justify-between text-neutral-200 px-1 mb-4">
          <span className="text-sm font-mono w-14 text-left tabular-nums">{currentTime}</span>
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button onClick={handlePlayPause} variant="ghost" size="icon" className="text-neutral-200 hover:text-sky-300 rounded-full hover:bg-neutral-700/60 w-11 h-11 md:w-12 md:h-12 transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-neutral-200 hover:text-sky-300 rounded-full hover:bg-neutral-700/60 w-11 h-11 md:w-12 md:h-12 transition-colors">
              <SkipForward className="w-6 h-6" />
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