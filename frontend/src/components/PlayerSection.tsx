"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // No longer needed here
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, SlidersHorizontal } from 'lucide-react'; // Changed Settings2 to SlidersHorizontal

const SAMPLE_AUDIO_URL = 'https://www.mfiles.co.uk/mp3-downloads/gs-cd-track2.mp3'; // Sample audio

const PRESET_FREQUENCIES = [
  { label: "417 Hz Release", value: 417 },
  { label: "528 Hz Miracle", value: 528 },
  { label: "639 Hz Connect", value: 639 },
];

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const PlayerSection: React.FC = () => {
  const [currentFrequency, setCurrentFrequency] = useState(PRESET_FREQUENCIES[1].value);
  const [selectedPresetValue, setSelectedPresetValue] = useState<string | undefined>(PRESET_FREQUENCIES[1].value.toString());
  
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7); // Initial volume 0-1
  const [trackTitle, setTrackTitle] = useState("Loading Sample Audio..."); // Updated initial title
  const [trackDuration, setTrackDuration] = useState("--:--"); // Updated initial duration
  const [currentTime, setCurrentTime] = useState("0:00");

  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) { // Initialize only once
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(148, 163, 184, 0.5)', // slate-400 opacity 50%
        progressColor: 'rgba(56, 189, 248, 0.8)', // sky-400 opacity 80%
        barWidth: 3, // Keep bars relatively thin
        barGap: 2,   // Spacing between bars
        barRadius: 3,
        height: 90, // Increased height for waveform
        cursorWidth: 2,
        cursorColor: 'rgba(34, 197, 94, 0.9)',
        dragToSeek: true,
        normalize: true,
      });
      wavesurferRef.current = ws;

      ws.load(SAMPLE_AUDIO_URL);

      ws.on('ready', () => {
        setTrackTitle("Sample Audio: Greensleeves"); // Set title on ready
        setTrackDuration(formatTime(ws.getDuration()));
        ws.setVolume(volume);
      });
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => { setIsPlaying(false); ws.seekTo(0); });
      ws.on('timeupdate', (time) => setCurrentTime(formatTime(time)));
      ws.on('error', (err) => { console.error("WaveSurfer error:", err); setTrackTitle("Error loading sample"); });

      return () => ws.destroy();
    }
  }, []); 

  useEffect(() => {
    wavesurferRef.current?.setVolume(volume);
  }, [volume]);

  const handleDialChange = (newFrequency: number) => {
    setCurrentFrequency(newFrequency);
    const matchedPreset = PRESET_FREQUENCIES.find(p => p.value === newFrequency);
    setSelectedPresetValue(matchedPreset ? matchedPreset.value.toString() : undefined);
    // TODO: Connect frequency change to audio processing if applicable
  };

  const handlePresetChange = (value: string) => {
    if (value) {
      const newFreq = parseInt(value);
      setSelectedPresetValue(value);
      setCurrentFrequency(newFreq);
    }
  };

  const handlePlayPause = () => wavesurferRef.current?.playPause();
  
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  return (
    <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-50">{trackTitle}</h2>
          <p className="text-sm md:text-base text-neutral-400">Duration: {trackDuration}</p>
        </div>

        <div className="flex justify-center mb-6 md:mb-8">
          <CircularFrequencyDial 
            initialFrequency={currentFrequency}
            onFrequencyChange={handleDialChange} 
            size={240} // Increased dial size
          />
        </div>

        <ToggleGroup 
          type="single" 
          variant="outline" 
          value={selectedPresetValue}
          onValueChange={handlePresetChange}
          className="flex justify-center mb-8 md:mb-10 space-x-2.5 md:space-x-3.5"
        >
          {PRESET_FREQUENCIES.map(preset => (
            <ToggleGroupItem 
              key={preset.value}
              value={preset.value.toString()} 
              aria-label={preset.label}
              className="px-4 py-2 text-sm rounded-lg 
                         border-neutral-700 bg-neutral-700/60 text-neutral-200 
                         hover:bg-neutral-600/80 hover:text-neutral-100 
                         focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800
                         data-[state=on]:bg-sky-500 data-[state=on]:text-white data-[state=on]:border-sky-400 data-[state=on]:shadow-lg"
            >
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