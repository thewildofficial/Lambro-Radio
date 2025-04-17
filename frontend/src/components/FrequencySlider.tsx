'use client';

import React from 'react';

interface FrequencyOption {
  label: string;
  value: number | null;
}

interface FrequencySliderProps {
  availableFrequencies: FrequencyOption[];
  selectedFrequency: number | null;
  onChange: (frequency: number | null) => void;
  disabled?: boolean;
}

const FrequencySlider: React.FC<FrequencySliderProps> = ({
  availableFrequencies,
  selectedFrequency,
  onChange,
  disabled = false,
}) => {
  const selectedIndex = availableFrequencies.findIndex(
    (freq) => freq.value === selectedFrequency
  );

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value, 10);
    onChange(availableFrequencies[index].value);
  };

  // Calculate slider background gradient based on selected index
  const percentage = selectedIndex >= 0 ? (selectedIndex / (availableFrequencies.length - 1)) * 100 : 0;
  const sliderBackground = `linear-gradient(to right, #8b5cf6 ${percentage}%, #4b5563 ${percentage}%)`;

  // Get active frequency info
  const activeFreq = availableFrequencies[selectedIndex];

  // Determine frequency description based on selected frequency
  const getFrequencyDescription = () => {
    if (selectedFrequency === null) return "Original frequency as recorded";
    if (selectedFrequency === 440) return "Standard A4 concert pitch (440 Hz)";
    if (selectedFrequency === 432) return "Allegedly more harmonious with nature (432 Hz)";
    
    // Solfeggio frequencies
    const solfeggioDescriptions: {[key: number]: string} = {
      396: "Ut - Associated with releasing guilt and fear",
      417: "Re - Facilitating change and transformation",
      528: "Mi - Transformation and DNA repair, miracle tone",
      639: "Fa - Connected to relationships and harmony",
      741: "Sol - Associated with intuition and awakening",
      852: "La - Returning to spiritual order",
      963: "Si - Awakening and connection to light"
    };
    
    return solfeggioDescriptions[selectedFrequency] || `Custom frequency: ${selectedFrequency} Hz`;
  };

  // Generate color based on frequency for visual feedback
  const getFrequencyColor = () => {
    if (selectedFrequency === null) return "text-gray-300";
    if (selectedFrequency === 432) return "text-green-400";
    if (selectedFrequency === 440) return "text-blue-400";
    
    // Solfeggio color scale
    if ([396, 417, 528, 639, 741, 852, 963].includes(selectedFrequency)) {
      return "text-violet-400";
    }
    
    return "text-indigo-400";
  };

  // Frequency category badge
  const getFrequencyBadge = () => {
    if (selectedFrequency === null) return null;
    
    if ([396, 417, 528, 639, 741, 852, 963].includes(selectedFrequency)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-900/30 text-violet-300 border border-violet-500/20">
          Solfeggio
        </span>
      );
    }
    
    if (selectedFrequency === 432) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-300 border border-green-500/20">
          Natural
        </span>
      );
    }
    
    if (selectedFrequency === 440) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-500/20">
          Standard
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-300 border border-gray-600/30">
        Custom
      </span>
    );
  };

  return (
    <div className={`space-y-4 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-5 rounded-xl border border-gray-700 shadow-inner transition-all duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:border-indigo-500/50'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <label htmlFor="frequency-slider" className="text-sm font-medium text-gray-300 whitespace-nowrap">
            Retune Frequency:
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="font-mono tracking-wide text-sm sm:text-base">
            <span className={`font-semibold ${getFrequencyColor()}`}>
              {activeFreq?.label || 'Original'}
            </span>
          </div>
          {getFrequencyBadge()}
        </div>
      </div>

      <div className="relative">
        <div className="w-full h-10 flex items-center relative">
          <input
            id="frequency-slider"
            type="range"
            min="0"
            max={availableFrequencies.length - 1}
            step="1"
            value={selectedIndex >= 0 ? selectedIndex : 0}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 slider-thumb"
            style={{ background: sliderBackground }}
          />
          
          {/* Tick marks */}
          <div className="absolute left-0 right-0 bottom-0 flex justify-between px-1 pointer-events-none">
            {availableFrequencies.map((freq, index) => (
              <div key={index} className={`h-2 w-[2px] ${index === selectedIndex ? 'bg-violet-400' : 'bg-gray-600'} transform translate-y-2`}></div>
            ))}
          </div>
        </div>
        
        {/* Frequency labels - only show selected, first, middle and last to avoid crowding */}
        <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-2 overflow-hidden">
          {availableFrequencies.map((freq, index) => {
            // Only show specific labels to avoid crowding
            if (index === 0 || index === selectedIndex || index === availableFrequencies.length - 1 || 
                index === Math.floor(availableFrequencies.length / 2)) {
              return (
                <div 
                  key={index} 
                  className={`text-center transform -translate-x-1/2 whitespace-nowrap ${index === selectedIndex ? 'text-violet-400' : ''}`}
                  style={{ position: 'absolute', left: `${(index / (availableFrequencies.length - 1)) * 100}%` }}
                >
                  {freq.label}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Frequency description */}
      <div className="pt-1">
        <p className="text-xs text-gray-400 italic">
          {getFrequencyDescription()}
        </p>
        <div className="w-full h-[3px] bg-gray-700/50 mt-3 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-300 ${getFrequencyColor().replace('text', 'bg')}`} 
               style={{ width: `${((selectedIndex || 0) / (availableFrequencies.length - 1)) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default FrequencySlider;
