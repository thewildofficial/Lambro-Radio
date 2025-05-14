"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // No longer needed here
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, SlidersHorizontal, RotateCcw, Loader2, AlertCircle, Music2 } from 'lucide-react'; // Added Music2
import { motion } from "framer-motion"; // Added motion
import { applyTheme, initializeTheme, getCurrentThemeValues } from '@/lib/theme-manager'; // Corrected path assuming components and lib are siblings under src
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel"; // Added Carousel imports

// Define props interface
interface PlayerSectionProps {
  initialAudioUrl?: string;
  initialTitle?: string;
  initialDuration?: number;
  initialThumbnailUrl?: string;
}

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
  if (isNaN(time) || time === Infinity || time < 0) return "--:--"; // Added guard for invalid time
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

// Updated component to accept props
const PlayerSection: React.FC<PlayerSectionProps> = ({
  initialAudioUrl,
  initialTitle,
  initialDuration,
  initialThumbnailUrl
}) => {
  const [currentFrequency, setCurrentFrequency] = useState<number | "default">("default");
  const [pendingFrequency, setPendingFrequency] = useState<number | "default">("default"); // For UI feedback before tuning
  const [selectedPresetValue, setSelectedPresetValue] = useState<string | undefined>(PRESET_FREQUENCIES[0].value);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const [activeItemStyle, setActiveItemStyle] = useState<React.CSSProperties>({}); // For dynamic button color
  
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  
  // Use props for initial track info, fallback to placeholders if no initial audio
  const [trackTitle, setTrackTitle] = useState(initialTitle || "No audio loaded");
  const [trackDuration, setTrackDuration] = useState(initialDuration ? formatTime(initialDuration) : "--:--");
  const [currentTime, setCurrentTime] = useState("0:00");

  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Store the original URL provided via props to re-use for processing
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | undefined>(initialAudioUrl);
  const [hasTunedOnce, setHasTunedOnce] = useState(false);

  // Function to load or reload audio in WaveSurfer
  const loadAudioInWaveSurfer = useCallback((audioUrl: string, title?: string, duration?: number) => {
    if (wavesurferRef.current) {
      // Before loading new audio, clear any existing error states related to WaveSurfer
      setProcessingError(null); 
      wavesurferRef.current.load(audioUrl);
      setTrackTitle(title || "Audio Track");
      // Duration will be set by WaveSurfer's 'ready' event for dynamically loaded audio
      if (duration) { // if a known duration is passed (e.g. from get_audio_info)
        setTrackDuration(formatTime(duration));
      } else {
        setTrackDuration("--:--"); // Reset while loading if unknown
      }
      setCurrentTime("0:00");
      setIsPlaying(false);
    }
  }, []);


  const handleProcessAndLoadAudio = useCallback(async (isInitialLoad = false) => {
    if (!sourceAudioUrl) {
      setProcessingError("No source audio URL available to process.");
      wavesurferRef.current?.empty();
      setTrackTitle("No audio loaded");
      setTrackDuration("--:--");
      setCurrentTime("0:00");
      setIsPlaying(false);
      return;
    }

    setIsProcessingAudio(true);
    setProcessingError(null);
    
    // Keep existing audio playable during processing
    if (isInitialLoad || !wavesurferRef.current?.getMediaElement()) {
      setTrackTitle("Processing audio...");
    }

    try {
      // These now correctly use the main state variables, which are set by Tune button or initial load
      const targetFreqValue = currentFrequency === "default" ? null : currentFrequency;
      
      console.log('Processing audio with settings:', {
        audio_url: sourceAudioUrl,
        frequency: targetFreqValue
      });
      
      const response = await fetch('http://localhost:8000/process_audio', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          audio_stream_url: sourceAudioUrl,
          target_frequency: targetFreqValue,
          // Removed AI preset parameter
        }),
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to process audio." }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      console.log('Audio processed successfully, loading into player');
      loadAudioInWaveSurfer(blobUrl, initialTitle || "Processed Audio");
      setProcessingError(null);
      if (!hasTunedOnce) setHasTunedOnce(true); 

    } catch (err: any) {
      console.error("Error processing audio:", err);
      setProcessingError(err.message || "An unknown error occurred during processing.");
      setTrackTitle(initialTitle || "Error processing");
    } finally {
      setIsProcessingAudio(false);
    }
  }, [sourceAudioUrl, currentFrequency, loadAudioInWaveSurfer, initialTitle]);


  // NEW: Handler for the "Tune Audio" button
  const handleTuneButtonClick = () => {
    console.log(`Tune button clicked. Pending Freq: ${pendingFrequency}`);
    setCurrentFrequency(pendingFrequency);
    // No direct call to handleProcessAndLoadAudio here.
    // The useEffect watching currentFrequency will trigger it.
    // Ensure hasTunedOnce is true so the effect for re-tunes can run.
    if (!hasTunedOnce) setHasTunedOnce(true); 
  };


  const handleThemeChange = useCallback((newFreq: number | string) => {
    applyTheme(newFreq.toString());
    // No direct audio processing calls here; effects will handle it.
  }, []);


  const handlePresetChange = useCallback((newPresetValue: string) => {
    setSelectedPresetValue(newPresetValue);
    const newFreq = newPresetValue === "default" ? "default" : parseInt(newPresetValue, 10);
    setPendingFrequency(newFreq); // Update PENDING frequency
    handleThemeChange(newFreq);
  }, [handleThemeChange]);

  const handleDialChange = useCallback((newNumericFrequency: number) => {
    setPendingFrequency(newNumericFrequency); // Update PENDING frequency

    const freqString = newNumericFrequency.toString();
    const matchedPreset = PRESET_FREQUENCIES.find(p => p.value === freqString);
    
    if (matchedPreset) {
      setSelectedPresetValue(matchedPreset.value);
    } else if (newNumericFrequency === 440) {
      setSelectedPresetValue("default");
    } else {
      setSelectedPresetValue(undefined);
    }
    handleThemeChange(newNumericFrequency);
  }, [handleThemeChange]);
  
  // Effect for initial state setup when a new audio source is provided
  useEffect(() => {
    console.log("New initialAudioUrl received or component mounted/props changed related to initial audio.");
    setSourceAudioUrl(initialAudioUrl); 
    setTrackTitle(initialTitle || (initialAudioUrl ? "Loading audio..." : "No audio loaded"));
    setTrackDuration(initialDuration ? formatTime(initialDuration) : "--:--");
    setCurrentTime("0:00");
    setIsPlaying(false);
    setProcessingError(null);
    
    // Reset pending and current states to default for a new track
    setPendingFrequency("default");
    setCurrentFrequency("default"); // Critical: Reset actual frequency for new track
    applyTheme("default");
    setHasTunedOnce(false); // IMPORTANT: Reset tune tracker for a new audio source

    if (!initialAudioUrl && wavesurferRef.current) {
        wavesurferRef.current.empty();
        // Title/duration already set above
    }
  }, [initialAudioUrl, initialTitle, initialDuration]); // Only depends on incoming props for new track identification


  // Effect for triggering audio processing (initial load or re-tune)
  useEffect(() => {
    if (!sourceAudioUrl) {
      console.log("Processing Effect: No sourceAudioUrl, exiting.");
      return;
    }

    if (!hasTunedOnce) { // This is the initial automatic load for the current sourceAudioUrl
      console.log("Processing Effect: Triggering initial audio processing (hasTunedOnce is false).");
      handleProcessAndLoadAudio(true); // isInitialLoad = true
      // setHasTunedOnce(true) is now handled inside handleProcessAndLoadAudio upon success
    } else {
      // This block will run if currentFrequency changes AFTER the initial load,
      // which should only happen via the Tune Button setting it.
      console.log("Processing Effect: Triggering re-tune due to currentFrequency change (hasTunedOnce is true).");
      handleProcessAndLoadAudio(false); // isInitialLoad = false
    }
    // IMPORTANT: Do NOT add hasTunedOnce to this dependency array, as its change is an outcome, not a trigger for this logic.
    // Adding it created the immediate re-process loop.
  }, [sourceAudioUrl, currentFrequency, handleProcessAndLoadAudio]);


  useEffect(() => { wavesurferRef.current?.setVolume(volume); }, [volume]);

  // Initialize WaveSurfer
  useEffect(() => {
        if (waveformRef.current && !wavesurferRef.current) {
      const colors = getWaveSurferThemeColors();
          const ws = WaveSurfer.create({
            container: waveformRef.current,
        waveColor: colors.waveColor,
        progressColor: colors.progressColor,
        cursorColor: colors.cursorColor,
        height: 90,
        url: "",
        backend: 'MediaElement',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        // Apple-like waveform styling
        fillParent: true,
        mediaControls: false,
        responsive: true,
        interact: true,
        hideScrollbar: true,
      });

      ws.on('ready', () => {
          wavesurferRef.current = ws;
        console.log('WaveSurfer ready!');
        setTrackDuration(formatTime(ws.getDuration()));
      });
      
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));
      
      ws.on('audioprocess', () => {
        if (ws.isPlaying()) {
          setCurrentTime(formatTime(ws.getCurrentTime()));
        }
      });

      wavesurferRef.current = ws;
      
      return () => {
        ws.destroy();
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => { 
        const newWaveTheme = getWaveSurferThemeColors();
        wavesurferRef.current?.setOptions({
          waveColor: newWaveTheme.waveColor, 
          progressColor: newWaveTheme.progressColor, 
          cursorColor: newWaveTheme.cursorColor,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
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
  }, [selectedPresetValue]); // selectedPresetValue implies theme has changed

  useEffect(() => {
    if (carouselApi && selectedPresetValue) {
      const selectedIndex = PRESET_FREQUENCIES.findIndex(p => p.value === selectedPresetValue);
      if (selectedIndex !== -1 && selectedIndex !== carouselApi.selectedScrollSnap()) {
        carouselApi.scrollTo(selectedIndex);
      }
    }
  }, [selectedPresetValue, carouselApi]);

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

  const handlePlayPause = () => {
    if (isProcessingAudio) return; // Don't allow play/pause during processing
    wavesurferRef.current?.playPause();
  };
  const handleVolumeChange = (value: number[]) => { setVolume(value[0] / 100); };
  const isDefaultPreset = (presetValue: string) => presetValue === "default";

  // Main Player UI (restored and refactored)
  if (initialAudioUrl && !isProcessingAudio) {
  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
    <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 md:p-8 flex flex-col gap-6">
            {/* Top Section: Thumbnail + Track Info + Controls */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
              {/* Thumbnail Section */}
              {initialThumbnailUrl && (
                <motion.div
                  className="flex-shrink-0 w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-lg relative bg-neutral-900"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <img
                    src={initialThumbnailUrl}
                    alt="Track thumbnail"
                    className="w-full h-full object-cover"
                    style={{ background: '#222' }}
                  />
                  {/* Optional: Overlay Play Button on Thumbnail */}
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    style={{ outline: 'none', border: 'none' }}
                    tabIndex={-1}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="w-12 h-12 text-white/90 drop-shadow-lg" />
                    ) : (
                      <Play className="w-12 h-12 text-white/90 drop-shadow-lg" />
                    )}
                  </button>
                </motion.div>
              )}

              {/* Main Controls Section */}
              <div className="flex-1 w-full flex flex-col gap-4">
                {/* Track Info */}
                <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-lg font-semibold text-neutral-100 truncate max-w-full" title={trackTitle}>{trackTitle}</div>
                  <div className="text-sm text-neutral-400 tabular-nums">{trackDuration}</div>
        </div>

                {/* Waveform Visualization */}
                <div className="w-full h-[90px] mb-2">
                  <div ref={waveformRef} className="w-full h-full" />
        </div>

                {/* Player Controls */}
                <div className="flex items-center gap-4 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    disabled={isProcessingAudio}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <Slider
                    min={0}
                    max={100}
                    value={[volume * 100]}
                    onValueChange={handleVolumeChange}
                    className="w-32"
                    aria-label="Volume"
                  />
                  <Volume2 className="w-5 h-5 text-neutral-400" />
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                      onClick={() => wavesurferRef.current?.seekTo(0)}
                      aria-label="Restart"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                      onClick={() => wavesurferRef.current?.seekTo(1)}
                      aria-label="Skip to End"
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequency Section */}
            <div className="flex flex-col gap-4">
              {/* Frequency Preset Carousel */}
              <div className="relative">
                <Carousel 
                  setApi={setCarouselApi} 
                  className="w-full"
                >
                  <div className="relative px-2">
                    <CarouselContent className="mx-0">
                      {PRESET_FREQUENCIES.map((preset, idx) => (
                        <CarouselItem key={preset.value} className="basis-1/4 md:basis-1/5 px-1">
                          <Button
                            variant={selectedPresetValue === preset.value ? "secondary" : "outline"}
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${selectedPresetValue === preset.value ? 'shadow-md' : 'text-neutral-300 hover:bg-neutral-700/70'}`}
                            style={selectedPresetValue === preset.value ? activeItemStyle : {}}
                            onClick={() => handlePresetChange(preset.value)}
                            aria-pressed={selectedPresetValue === preset.value}
                          >
                            {preset.label}
                          </Button>
                </CarouselItem>
              ))}
            </CarouselContent>
                    
                    <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-neutral-700/70 hover:bg-neutral-600/90 border-neutral-600/70 text-white rounded-full h-8 w-8 flex items-center justify-center disabled:opacity-50" />
                    <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-neutral-700/70 hover:bg-neutral-600/90 border-neutral-600/70 text-white rounded-full h-8 w-8 flex items-center justify-center disabled:opacity-50" />
                  </div>
          </Carousel>
        </div>
        
              {/* Frequency Dial and AI Preset */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-2">
                <div className="flex flex-col items-center">
                  <Label htmlFor="frequency-dial" className="mb-1 text-neutral-300">Custom Frequency</Label>
                  <CircularFrequencyDial
                    id="frequency-dial"
                    value={pendingFrequency === "default" ? "default" : pendingFrequency}
                    onChange={handleDialChange}
                    min={174}
                    max={963}
                    disabled={isProcessingAudio || !sourceAudioUrl}
                  />
                </div>
              </div>

              {/* Tune Button */}
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={handleTuneButtonClick} 
                  disabled={isProcessingAudio || !sourceAudioUrl || 
                    (pendingFrequency === currentFrequency)}
                  className="px-8 py-3 font-medium text-base bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg rounded-lg transition-all duration-300"
                >
                  <Music2 className="w-5 h-5 mr-2" />
                  Tune Audio
            </Button>
          </div>

              {/* Error State */}
              {processingError && (
                <div className="mt-3 text-red-400 bg-red-900/30 p-3 rounded-lg text-sm text-center border border-red-700/50">
                  <AlertCircle className="inline-block w-4 h-4 mr-1 mb-0.5" />
                  {processingError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Loading state for audio processing
  if (isProcessingAudio && !processingError) {
     return (
       <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
       >
        <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 md:p-8 flex flex-col gap-6">
            {/* Top Section: Thumbnail + Track Info + Controls */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
              {/* Thumbnail Section */}
              {initialThumbnailUrl && (
                <motion.div
                  className="flex-shrink-0 w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-lg relative bg-neutral-900"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <img
                    src={initialThumbnailUrl}
                    alt="Track thumbnail"
                    className="w-full h-full object-cover"
                    style={{ background: '#222' }}
                  />
                  {/* Dim overlay during processing */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                </motion.div>
              )}

              {/* Main Controls Section */}
              <div className="flex-1 w-full flex flex-col gap-4">
                {/* Track Info with Processing indicator */}
                <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-lg font-semibold text-neutral-100 truncate max-w-full flex items-center" title={trackTitle}>
                    <span>{initialTitle || "Processing audio..."}</span>
                    <Loader2 className="w-4 h-4 ml-2 text-sky-500 animate-spin" />
                  </div>
                  <div className="text-sm text-neutral-400 tabular-nums">{trackDuration}</div>
                </div>

                {/* Waveform Visualization - still visible during processing */}
                <div className="w-full h-[90px] mb-2 relative">
                  <div ref={waveformRef} className="w-full h-full" />
                  {/* Dim overlay for waveform during processing */}
                  <div className="absolute inset-0 bg-black/30 rounded-md"></div>
        </div>

                {/* Player Controls - disabled during processing */}
                <div className="flex items-center gap-4 mb-2 opacity-70">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                    disabled={true}
                    aria-label="Play"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                <Slider 
                    min={0}
                    max={100}
                    value={[volume * 100]}
                    disabled={true}
                    className="w-32"
                    aria-label="Volume"
                  />
                  <Volume2 className="w-5 h-5 text-neutral-400" />
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                      disabled={true}
                      aria-label="Restart"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                      disabled={true}
                      aria-label="Skip to End"
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequency Section */}
            <div className="flex flex-col gap-4">
              {/* Frequency Preset Carousel - disabled during processing */}
              <div className="relative opacity-70">
                <Carousel 
                  setApi={setCarouselApi} 
                  className="w-full"
                >
                  <div className="relative px-2">
                    <CarouselContent className="mx-0">
                      {PRESET_FREQUENCIES.map((preset, idx) => (
                        <CarouselItem key={preset.value} className="basis-1/4 md:basis-1/5 px-1">
                          <Button
                            variant={selectedPresetValue === preset.value ? "secondary" : "outline"}
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${selectedPresetValue === preset.value ? 'shadow-md' : 'text-neutral-300 hover:bg-neutral-700/70'}`}
                            style={selectedPresetValue === preset.value ? activeItemStyle : {}}
                            disabled={true}
                            aria-pressed={selectedPresetValue === preset.value}
                          >
                            {preset.label}
                          </Button>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    
                    <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-neutral-700/70 hover:bg-neutral-600/90 border-neutral-600/70 text-white rounded-full h-8 w-8 flex items-center justify-center disabled:opacity-50" disabled />
                    <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-neutral-700/70 hover:bg-neutral-600/90 border-neutral-600/70 text-white rounded-full h-8 w-8 flex items-center justify-center disabled:opacity-50" disabled />
                  </div>
                </Carousel>
              </div>
              
              {/* Frequency Dial */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-2 opacity-70">
                <div className="flex flex-col items-center">
                  <Label htmlFor="frequency-dial" className="mb-1 text-neutral-300">Custom Frequency</Label>
                  <CircularFrequencyDial
                    id="frequency-dial"
                    value={pendingFrequency === "default" ? "default" : pendingFrequency}
                    onChange={handleDialChange}
                    min={174}
                    max={963}
                    disabled={true}
                  />
                </div>
              </div>

              {/* Processing Status Banner */}
              <div className="my-2 text-center bg-indigo-900/50 p-4 rounded-lg border border-indigo-800/50">
                <Loader2 className="w-5 h-5 text-indigo-300 animate-spin inline-block mr-2" />
                <span className="text-indigo-100">Processing audio with {pendingFrequency === "default" ? "default tuning" : `${pendingFrequency} Hz`}...</span>
              </div>

              {/* Tune Button - disabled during processing */}
              <div className="flex justify-center mt-4">
                <Button 
                  disabled={true}
                  className="px-8 py-3 font-medium text-base bg-gradient-to-br from-purple-500/60 to-indigo-600/60 text-white/70 shadow-lg rounded-lg transition-all duration-300"
                >
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
            </Button>
        </div>
            </div>
          </CardContent>
        </Card>
       </motion.div>
     );
  }
  
  // Fallback if none of the above conditions are met (should ideally not be reached if logic is correct)
  return (
    <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden min-h-[350px] flex items-center justify-center">
        <CardContent>
            <p>Unexpected Player State</p>
      </CardContent>
    </Card>
  );

};

export default PlayerSection; 