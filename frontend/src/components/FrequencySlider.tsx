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
  const sliderBackground = `linear-gradient(to right, #4f46e5 ${percentage}%, #4b5563 ${percentage}%)`; // Indigo-600 and Gray-600

  return (
    <div className={`flex flex-col items-center gap-3 bg-gray-800 p-4 rounded-lg border border-gray-600 hover:border-indigo-500 transition-colors transition-shadow ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
      <label htmlFor="frequency-slider" className="text-sm font-medium self-start whitespace-nowrap">
        Retune A4 to: <span className="font-bold text-indigo-400">{availableFrequencies[selectedIndex]?.label || 'Original'}</span>
      </label>
      <div className="w-full relative pt-1">
        <input
          id="frequency-slider"
          type="range"
          min="0"
          max={availableFrequencies.length - 1}
          step="1"
          value={selectedIndex >= 0 ? selectedIndex : 0}
          onChange={handleSliderChange}
          disabled={disabled}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 slider-thumb"
          style={{ background: sliderBackground }} // Apply dynamic background
        />
        {/* Optional: Add marks below the slider */}
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          {availableFrequencies.map((freq, index) => (
            <span key={index} className="transform -translate-x-1/2">
              |
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FrequencySlider;
