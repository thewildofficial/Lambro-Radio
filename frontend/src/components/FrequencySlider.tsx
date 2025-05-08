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

  const percentage = selectedIndex >= 0 ? (selectedIndex / (availableFrequencies.length - 1)) * 100 : 0;
  const sliderBackground = disabled 
    ? `linear-gradient(to right, #3A3A3C ${percentage}%, #2C2C2E ${percentage}%)` // apple-bg-tertiary (track), apple-bg-secondary (bg)
    : `linear-gradient(to right, #0A84FF ${percentage}%, #3A3A3C ${percentage}%)`; // apple-accent-blue (track), apple-bg-tertiary (bg)

  const activeFreq = availableFrequencies[selectedIndex >= 0 ? selectedIndex : 0];

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-apple-text-secondary">
          {activeFreq?.label || 'Select Frequency'}
        </span>
        {/* Optional: Badge for frequency type - can be simplified or removed if too cluttered */}
        {/* {getFrequencyBadge()} */}
      </div>

      <input
        id="frequency-slider"
        type="range"
        min="0"
        max={availableFrequencies.length - 1}
        step="1"
        value={selectedIndex >= 0 ? selectedIndex : 0}
        onChange={handleSliderChange}
        disabled={disabled}
        className={`w-full h-2 appearance-none cursor-pointer rounded-apple-sm range-thumb-apple ${disabled ? 'bg-apple-bg-secondary' : 'bg-apple-bg-tertiary'}`}
        style={{ background: sliderBackground }}
      />
      
      {/* Simplified tick marks or remove if too busy for Apple aesthetic */}
      {/* <div className="flex justify-between text-[10px] text-apple-text-tertiary px-1 mt-1">
        <span>{availableFrequencies[0].label}</span>
        <span>{availableFrequencies[availableFrequencies.length - 1].label}</span>
      </div> */}

      {/* Optional: Description - keep it minimal */}
      {/* <p className="text-xs text-apple-text-tertiary italic pt-1">
        {activeFreq?.value === null ? "Original audio frequency" : `Target: ${activeFreq?.value} Hz`}
      </p> */}
    </div>
  );
};

export default FrequencySlider;
