"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, RotateCcw, Loader2, AlertCircle, Music2, Download, Share2 } from 'lucide-react';
import { motion } from "framer-motion";
import { applyTheme } from '@/lib/theme-manager';
import WaveformVisualizer from './WaveformVisualizer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";
import { Toaster, toast } from "sonner";

// Define props interface
interface PlayerSectionProps {
  initialAudioUrl?: string;
  initialTitle?: string;
  initialDuration?: number;
  initialThumbnailUrl?: string;
  originalYoutubeUrl?: string;
  sharedFrequency?: number | "default";
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
const SOLFEGGIO_TIDBITS = [
  "Some theories link 528 Hz to cellular repair. While more research is needed, it's a cornerstone of many sound healing practices.",
  "Dr. Masaru Emoto's experiments showed that water exposed to loving words or harmonious music formed beautiful crystals. Imagine what Solfeggio tones might do!",
  "Cymatics visualizes sound: specific frequencies, like those in the Solfeggio scale, can create stunning geometric patterns in water or sand.",
  "Feeling out of sorts? 396 Hz is often used in sound baths to help release feelings of fear and guilt, aiming for a sense of grounding.",
  "The 'lost' Solfeggio scale was rediscovered using a mathematical sequence found in the Book of Numbers. Ancient wisdom, modern curiosity!",
  "417 Hz is sometimes called the 'frequency of transmutation,' believed to help clear negative energy and facilitate positive change at a deep level.",
  "Gregorian chants, which utilized similar ancient scales, were known for their profound spiritual and calming effects on listeners.",
  "While individual experiences vary, many report feelings of deep relaxation and clarity after listening to Solfeggio frequencies.",
  "Sound therapy explores how different Hz values might interact with our body's energy centers, or chakras, promoting balance.",
  "Think of it like tuning an instrument! The idea is that Solfeggio frequencies help 'tune' your body and mind for optimal resonance."
];

const formatTime = (time: number) => {
  if (isNaN(time) || time === Infinity || time < 0) return "--:--"; // Added guard for invalid time
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

// Updated component to accept props
const PlayerSection: React.FC<PlayerSectionProps> = ({
  initialAudioUrl,
  initialTitle,
  initialDuration,
  initialThumbnailUrl,
  originalYoutubeUrl,
  sharedFrequency
}) => {
  const [currentFrequency, setCurrentFrequency] = useState<number | "default">(sharedFrequency ?? "default");
  const [pendingFrequency, setPendingFrequency] = useState<number | "default">(sharedFrequency ?? "default");
  const [selectedPresetValue, setSelectedPresetValue] = useState<string | undefined>(PRESET_FREQUENCIES[0].value);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const [activeItemStyle, setActiveItemStyle] = useState<React.CSSProperties>({}); // For dynamic button color
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  
  // Use props for initial track info, fallback to placeholders if no initial audio
  const [trackTitle, setTrackTitle] = useState(initialTitle || "No audio loaded");
  const [trackDuration, setTrackDuration] = useState(initialDuration ? formatTime(initialDuration) : "--:--");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentTime, setCurrentTime] = useState("0:00");

  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [displayedFact, setDisplayedFact] = useState<string>("");

  // Store the original URL provided via props to re-use for processing
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | undefined>(initialAudioUrl);
  const [hasTunedOnce, setHasTunedOnce] = useState(false);
  const processedUrlRef = useRef<string | undefined>(undefined);
  
  // Store the processed audio URL for WaveformVisualizer
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);

  const handleProcessAndLoadAudio = useCallback(async (isInitialLoad = false) => {
    console.log('[handleProcessAndLoadAudio] Called. isInitialLoad:', isInitialLoad, 'sourceAudioUrl:', sourceAudioUrl);

    if (!sourceAudioUrl) {
      setProcessingError("No source audio URL available to process.");
      setTrackTitle("No audio loaded");
      setTrackDuration("--:--");
      setCurrentTime("0:00");
      setIsPlaying(false);
      setProcessedAudioUrl(null);
      return;
    }

    setIsProcessingAudio(true);
    setProcessingError(null);
    
    // Keep existing audio playable during processing
    if (isInitialLoad) {
      setTrackTitle("Processing audio...");
    }

    try {
      const targetFreqValue = currentFrequency === "default" ? null : currentFrequency;
      
      console.log('[handleProcessAndLoadAudio] Preparing to fetch. Settings:', {
        audio_url: sourceAudioUrl,
        frequency: targetFreqValue
      });
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/process_audio`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          audio_stream_url: sourceAudioUrl,
          target_frequency: targetFreqValue,
        }),
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('[handleProcessAndLoadAudio] Fetch response received. ok:', response.ok, 'status:', response.status);

      if (!response.ok) {
        let errorDetail = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || JSON.stringify(errorData);
          console.error('[handleProcessAndLoadAudio] Fetch error data:', errorData);
        } catch (jsonError) {
          console.error('[handleProcessAndLoadAudio] Failed to parse error JSON from server:', jsonError);
          const textError = await response.text().catch(() => "Could not read error text response.");
          errorDetail = textError || errorDetail;
        }
        throw new Error(errorDetail);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      console.log('[handleProcessAndLoadAudio] Audio processed successfully. Blob URL created:', blobUrl);
      
      // Set the processed audio URL for the WaveformVisualizer
      setProcessedAudioUrl(blobUrl);
      setTrackTitle(initialTitle || "Processed Audio");
      if (!hasTunedOnce) setHasTunedOnce(true); 
      setProcessingError(null);

    } catch (err: unknown) {
      console.error("[handleProcessAndLoadAudio] Error during audio processing pipeline:", err);
      if (err instanceof Error) {
        setProcessingError(err.message);
      } else {
        setProcessingError("An unknown error occurred during processing.");
      }
      setTrackTitle(initialTitle || "Error processing");
      setProcessedAudioUrl(null);
    } finally {
      setIsProcessingAudio(false);
    }
  }, [sourceAudioUrl, currentFrequency, initialTitle]);

  // NEW: Handler for the "Tune Audio" button
  const handleTuneButtonClick = () => {
    console.log(`Tune button clicked. Pending Freq: ${pendingFrequency}`);
    setCurrentFrequency(pendingFrequency);
    // No direct call to handleProcessAndLoadAudio here.
    // The useEffect watching currentFrequency will trigger it.
    // Ensure hasTunedOnce is true so the effect for re-tunes can run.
    if (!hasTunedOnce) setHasTunedOnce(true); 
  };

  const handleDownload = useCallback(() => {
    if (!processedAudioUrl || !trackTitle) {
        console.warn("Download attempted but no processed audio URL or title available.");
        return;
    }

    // Sanitize trackTitle to be filesystem-friendly
    const fileNameBase = trackTitle.replace(/[^a-z0-9_\-\\s]/gi, '_').replace(/\s+/g, '_');
    const frequencyLabel = currentFrequency === "default" ? "original" : `${currentFrequency}Hz`;
    const fileName = `${fileNameBase}_${frequencyLabel}.mp3`;

    const a = document.createElement('a');
    a.href = processedAudioUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [processedAudioUrl, trackTitle, currentFrequency]);

  const handleShare = useCallback(() => {
    if (!originalYoutubeUrl) {
      toast.error("Cannot share: Original video URL is not available.");
      return;
    }
    if (currentFrequency === undefined) {
        toast.error("Cannot share: Frequency not set.");
        return;
    }

    try {
      let url;
      try {
        url = new URL(originalYoutubeUrl);
      } catch (e) {
        toast.error("Invalid original video URL format for sharing.");
        console.error("Invalid URL for sharing:", originalYoutubeUrl, e);
        return;
      }
      
      const videoId = url.searchParams.get('v');
      if (!videoId) {
        toast.error("Could not extract video ID from the URL for sharing.");
        return;
      }
      const shareUrl = `${window.location.origin}/?yt=${videoId}&freq=${currentFrequency}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Link copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy share link:", err);
        toast.error("Failed to copy link. Check browser permissions.");
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error("Failed to create share link due to an unexpected error.");
    }
  }, [originalYoutubeUrl, currentFrequency]);

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

  const handleDialChange = useCallback((newNumericFrequency: number | "default") => {
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
    // Only perform a full reset if the initialAudioUrl prop is truly new
    // or has been cleared, compared to the current sourceAudioUrl.
    if (initialAudioUrl !== sourceAudioUrl) { 
      console.log("New initialAudioUrl detected or changed, performing full reset:", initialAudioUrl, "Current sourceAudioUrl:", sourceAudioUrl);
      processedUrlRef.current = undefined;
      setSourceAudioUrl(initialAudioUrl); 
      setTrackTitle(initialTitle || (initialAudioUrl ? "Loading audio..." : "No audio loaded"));
      setTrackDuration(initialDuration ? formatTime(initialDuration) : "--:--");
      setCurrentTime("0:00");
      setIsPlaying(false);
      setProcessingError(null);
      setProcessedAudioUrl(null);
      
      // Reset frequency and theme for a new track
      setPendingFrequency("default");
      setCurrentFrequency("default");
      applyTheme("default");
      setHasTunedOnce(false); // Crucial: only reset for a new track
    } else {
      // initialAudioUrl is the same as sourceAudioUrl,
      // only update ancillary info if it has changed (e.g., title/duration from parent)
      console.log("initialAudioUrl is same as current sourceAudioUrl. Updating ancillary info if changed:", { initialTitle, currentTrackTitle: trackTitle, initialDuration, currentTrackDuration: trackDuration });
      if (initialTitle && initialTitle !== trackTitle) {
        console.log("Updating track title from prop:", initialTitle);
        setTrackTitle(initialTitle);
      }
      if (initialDuration && formatTime(initialDuration) !== trackDuration) {
        console.log("Updating track duration from prop:", formatTime(initialDuration));
        setTrackDuration(formatTime(initialDuration));
      }
    }
    // Add sourceAudioUrl to dependencies to correctly compare initialAudioUrl against the current internal state.
    // Add trackTitle and trackDuration to allow ancillary updates if initialAudioUrl hasn't changed.
  }, [initialAudioUrl, initialTitle, initialDuration, sourceAudioUrl, trackTitle, trackDuration]);

  // Effect for triggering audio processing (initial load or re-tune)
  useEffect(() => {
    if (!sourceAudioUrl) {
      console.log("Processing Effect: No sourceAudioUrl, exiting.");
      return;
    }

    if (!hasTunedOnce) { // This is the initial automatic load for the current sourceAudioUrl
      if (sourceAudioUrl !== processedUrlRef.current) {
        console.log("Processing Effect: Triggering initial audio processing (hasTunedOnce is false, URL is new or different from ref).");
        handleProcessAndLoadAudio(true); // isInitialLoad = true
        processedUrlRef.current = sourceAudioUrl; // Mark this URL as processed
      } else {
        console.log("Processing Effect: Initial load for this URL (sourceAudioUrl) already triggered in this ref, skipping. (hasTunedOnce is false).");
      }
    } else {
      // This block will run if currentFrequency changes AFTER the initial load,
      console.log("Processing Effect: Triggering re-tune due to currentFrequency change (hasTunedOnce is true).");
      handleProcessAndLoadAudio(false); // isInitialLoad = false
    }
  }, [sourceAudioUrl, currentFrequency, handleProcessAndLoadAudio]);

  const handleVolumeChange = (value: number[]) => { 
    const newVolume = value[0] / 100;
    setVolume(newVolume);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => { 
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
    console.log(`[PlayerSection] handlePlayPause: Called. Current isPlaying: ${isPlaying}, processedAudioUrl: ${processedAudioUrl}`);
    setIsPlaying(!isPlaying);
    console.log(`[PlayerSection] handlePlayPause: New isPlaying will be: ${!isPlaying}`);
  };
  
  // Effect for cycling fun facts during loading
  useEffect(() => {
    let factInterval: NodeJS.Timeout | undefined = undefined;

    if (isProcessingAudio && !processingError) {
      // Set initial fact
      setDisplayedFact(SOLFEGGIO_TIDBITS[Math.floor(Math.random() * SOLFEGGIO_TIDBITS.length)]);
      
      // Cycle facts every 7 seconds
      factInterval = setInterval(() => {
        setDisplayedFact(SOLFEGGIO_TIDBITS[Math.floor(Math.random() * SOLFEGGIO_TIDBITS.length)]);
      }, 7000);
    } else {
      if (factInterval) {
        clearInterval(factInterval);
      }
    }
    return () => {
      if (factInterval) {
        clearInterval(factInterval);
      }
    };
  }, [isProcessingAudio, processingError]);

  // Memoized callbacks for WaveformVisualizer
  const handleWaveformPlayPause = useCallback((playing: boolean) => {
    console.log('[PlayerSection] handleWaveformPlayPause called with:', playing);
    // Only update if different, to prevent loops if WaveSurfer itself triggers this
    if (isPlaying !== playing) {
      setIsPlaying(playing);
    }
  }, [isPlaying]); // Dependency: isPlaying

  const handleWaveformTimeUpdate = useCallback((time: number) => {
    setCurrentTime(formatTime(time));
  }, []); // No dependencies, formatTime is stable, setCurrentTime is stable

  useEffect(() => {
    if (sharedFrequency !== undefined && sharedFrequency !== currentFrequency) {
      console.log('[PlayerSection] useEffect: sharedFrequency prop changed or provided:', sharedFrequency, 'Updating currentFrequency.');
      setCurrentFrequency(sharedFrequency);
      setPendingFrequency(sharedFrequency); // Also update pending frequency
      handleThemeChange(sharedFrequency);
      if (!hasTunedOnce && initialAudioUrl) setHasTunedOnce(true);
    }
  }, [sharedFrequency, currentFrequency, handleThemeChange, initialAudioUrl, hasTunedOnce]);

  // Conditional Rendering Logic Reordered and Hero Section Added
  if (!sourceAudioUrl && !isProcessingAudio) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Toaster position="bottom-right" richColors />
        <Card className="w-full bg-neutral-800/70 backdrop-blur-lg border border-neutral-700/60 text-neutral-100 shadow-2xl rounded-2xl overflow-hidden min-h-[450px] flex flex-col items-center justify-center">
          <CardContent className="p-6 md:p-8 text-center flex flex-col items-center gap-4">
            <Music2 className="w-16 h-16 text-purple-400 mb-4 opacity-80" />
            <h2 className="text-3xl font-bold tracking-tight text-neutral-50">
              Welcome to Lambro Radio Tuner
            </h2>
            <p className="text-neutral-300 max-w-lg text-lg">
              Paste a YouTube link into the input field (usually above this section) to load your favorite tracks.
              Then, use the controls to explore different audio frequencies and discover new sonic dimensions.
            </p>
            <p className="text-sm text-neutral-400 mt-2">
              Ready to tune your vibes?
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Main Player UI (restored and refactored)
  if (sourceAudioUrl && !isProcessingAudio) {
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
              <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
                {/* Track Info */}
                <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-lg font-semibold text-neutral-100 truncate max-w-full" title={trackTitle}>{trackTitle}</div>
                  <div className="text-sm text-neutral-400 tabular-nums">{trackDuration}</div>
                </div>

                {/* Waveform Visualization */}
                <div className="w-full h-[90px] mb-2">
                  <WaveformVisualizer 
                    audioUrl={processedAudioUrl}
                    isProcessing={isProcessingAudio}
                    isPlaying={isPlaying}
                    onPlayPause={handleWaveformPlayPause}
                    onTimeUpdate={handleWaveformTimeUpdate}
                  />
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
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTime("0:00");
                      }}
                      aria-label="Restart"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-neutral-700/60 hover:bg-neutral-600/80 text-neutral-100 shadow"
                      onClick={() => {
                        // Skip to end
                        setIsPlaying(false);
                        setCurrentTime(trackDuration);
                      }}
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
                      {PRESET_FREQUENCIES.map((preset) => (
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

              {/* Download and Share Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-neutral-700/80 hover:bg-neutral-600/90 border-neutral-600 text-neutral-200 transition-all duration-150 ease-out active:scale-95 w-11 h-11"
                  onClick={handleDownload}
                  disabled={!processedAudioUrl || isProcessingAudio}
                  title="Download Processed Audio"
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-neutral-700/80 hover:bg-neutral-600/90 border-neutral-600 text-neutral-200 transition-all duration-150 ease-out active:scale-95 w-11 h-11"
                  onClick={handleShare}
                  disabled={!originalYoutubeUrl || currentFrequency === undefined || isProcessingAudio}
                  title="Share Link with Current Settings"
                >
                  <Share2 className="w-5 h-5" />
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

  // Loading state for audio processing (consolidated)
  if (isProcessingAudio && !processingError) {
     console.log('[PlayerSection] Rendering Loading state. isProcessingAudio:', isProcessingAudio, 'processingError:', processingError);
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
                  <WaveformVisualizer 
                    audioUrl={processedAudioUrl}
                    isProcessing={true}
                    isPlaying={false}
                  />
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
                      {PRESET_FREQUENCIES.map((preset) => (
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

              {/* Processing Status Banner / Fun Fact Display */}
              <div className="my-2 text-center bg-indigo-900/50 p-4 rounded-lg border border-indigo-800/50 min-h-[60px] flex flex-col justify-center items-center">
                <Loader2 className="w-5 h-5 text-indigo-300 animate-spin mb-2" />
                <span className="text-indigo-100 text-sm px-2">{displayedFact || "Tuning the vibes..."}</span>
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

              {/* Download Button - Disabled during processing */}
              <div className="flex justify-center mt-3">
                  <Button
                    disabled={true}
                    className="px-8 py-3 font-medium text-base bg-green-600/60 text-white/70 shadow-lg rounded-lg transition-all duration-300"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Audio
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>
       </motion.div>
     );
  }
  
  // This console log will help verify states when deciding to show processing UI
  console.log('[PlayerSection] Evaluating render conditions. isProcessingAudio:', isProcessingAudio, 'processingError:', processingError, 'initialAudioUrl:', initialAudioUrl, 'sourceAudioUrl:', sourceAudioUrl);
  
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