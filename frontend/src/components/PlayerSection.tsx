"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // No longer needed here
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import CircularFrequencyDial from "@/components/ui/CircularFrequencyDial";
import { Play, Pause, SkipForward, Volume2, SlidersHorizontal } from 'lucide-react'; // Changed Settings2 to SlidersHorizontal

// Placeholder data - this would come from props or state
const trackInfo = {
  title: "L'Orbite de Nuit",
  duration: "5:51",
};

const PRESET_FREQUENCIES = [
  { label: "417 Hz Release", value: 417 },
  { label: "528 Hz Miracle", value: 528 },
  { label: "639 Hz Connect", value: 639 },
];

const PlayerSection: React.FC = () => {
  // The dial itself manages its full list of Solfeggio frequencies.
  // This state is for the PlayerSection to know the current frequency for display/control.
  const [currentFrequency, setCurrentFrequency] = React.useState(PRESET_FREQUENCIES[1].value); // Default to 528 Hz
  const [selectedPresetValue, setSelectedPresetValue] = React.useState<string | undefined>(PRESET_FREQUENCIES[1].value.toString());

  const handleDialChange = (newFrequency: number) => {
    setCurrentFrequency(newFrequency);
    // Check if the new frequency from the dial matches one of our three main presets
    const matchedPreset = PRESET_FREQUENCIES.find(p => p.value === newFrequency);
    setSelectedPresetValue(matchedPreset ? matchedPreset.value.toString() : undefined);
  };

  const handlePresetChange = (value: string) => {
    if (value) {
      const newFreq = parseInt(value);
      setSelectedPresetValue(value);
      setCurrentFrequency(newFreq); // This will make the dial snap to this frequency
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-neutral-800/80 backdrop-blur-sm border-neutral-700/60 text-neutral-50 shadow-2xl rounded-xl overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-neutral-100">{trackInfo.title}</h2>
          <p className="text-sm text-neutral-400">Duration: {trackInfo.duration}</p>
        </div>

        <div className="flex justify-center mb-6">
          <CircularFrequencyDial 
            initialFrequency={currentFrequency} // Drive the dial with this state
            onFrequencyChange={handleDialChange} 
            size={220} 
          />
        </div>

        <ToggleGroup 
          type="single" 
          variant="outline" 
          value={selectedPresetValue}
          onValueChange={handlePresetChange}
          className="flex justify-center mb-8 space-x-2 md:space-x-3"
        >
          {PRESET_FREQUENCIES.map(preset => (
            <ToggleGroupItem 
              key={preset.value}
              value={preset.value.toString()} 
              aria-label={preset.label}
              className="px-3 py-2 md:px-4 text-xs md:text-sm rounded-md 
                         bg-neutral-700/70 border-neutral-600/80 text-neutral-300 
                         hover:bg-neutral-600/90 hover:text-neutral-100 
                         focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800
                         data-[state=on]:bg-sky-600 data-[state=on]:text-white data-[state=on]:border-sky-500 data-[state=on]:shadow-md"
            >
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="h-20 bg-neutral-700/40 rounded-md flex items-center justify-center text-neutral-500 mb-6">
          Waveform Display Area
        </div>

        <div className="flex items-center justify-between text-neutral-300 px-1">
          <span className="text-xs font-mono">0:10</span>
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button variant="ghost" size="icon" className="text-neutral-300 hover:text-white rounded-full hover:bg-neutral-700/70 w-10 h-10 md:w-12 md:h-12">
              <Play className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-neutral-300 hover:text-white rounded-full hover:bg-neutral-700/70 w-10 h-10 md:w-12 md:h-12">
              <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
          <span className="text-xs font-mono">{trackInfo.duration}</span>
        </div>

        <div className="flex items-center justify-between mt-4 px-1">
            <div className="flex items-center space-x-2 w-full max-w-xs">
                <Volume2 className="w-5 h-5 text-neutral-400 flex-shrink-0"/>
                <Slider 
                    defaultValue={[70]} 
                    max={100} 
                    step={1} 
                    className="[&>span:first-child>.relative]:h-1 [&>span:first-child>.relative>.absolute]:bg-sky-500 
                               [&>span:first-child>.relative]:bg-neutral-600/80 
                               [&_span[role=slider]]:bg-white 
                               [&_span[role=slider]]:w-3.5 [&_span[role=slider]]:h-3.5 
                               [&_span[role=slider]]:border-0 
                               [&_span[role=slider]]:shadow 
                               focus-visible:ring-sky-500 focus-visible:ring-offset-neutral-800"
                />
            </div>
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white rounded-full hover:bg-neutral-700/70 w-8 h-8">
                <SlidersHorizontal className="w-5 h-5" /> 
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerSection; 