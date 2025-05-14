'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FrequencyOption {
  label: string;
  value: number | null;
}

interface FrequencySliderProps {
  availableFrequencies: FrequencyOption[];
  selectedFrequency: number | null;
  onChange: (frequency: number | null) => void;
  disabled?: boolean;
  className?: string;
}

const FrequencySlider: React.FC<FrequencySliderProps> = ({
  availableFrequencies,
  selectedFrequency,
  onChange,
  disabled = false,
  className = '',
}) => {
  const sliderRef = useRef<HTMLInputElement>(null);
  const selectedIndex = availableFrequencies.findIndex(
    (freq) => freq.value === selectedFrequency
  );

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value, 10);
    onChange(availableFrequencies[index].value);
  };

  const percentage = selectedIndex >= 0 ? (selectedIndex / (availableFrequencies.length - 1)) * 100 : 0;
  
  // Apple-inspired gradient colors
  const sliderBackground = disabled 
    ? `linear-gradient(to right, rgba(142, 142, 147, 0.4) ${percentage}%, rgba(99, 99, 102, 0.2) ${percentage}%)` 
    : `linear-gradient(to right, rgb(0, 122, 255) ${percentage}%, rgba(142, 142, 147, 0.3) ${percentage}%)`;

  const activeFreq = availableFrequencies[selectedIndex >= 0 ? selectedIndex : 0];

  // Handle keyboard navigation
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (document.activeElement !== slider) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = Math.min(selectedIndex + 1, availableFrequencies.length - 1);
        onChange(availableFrequencies[newIndex].value);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = Math.max(selectedIndex - 1, 0);
        onChange(availableFrequencies[newIndex].value);
      }
    };

    slider.addEventListener('keydown', handleKeyDown);
    return () => {
      slider.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, availableFrequencies, onChange, disabled]);

  return (
    <motion.div 
      className={`space-y-3 px-1 ${disabled ? 'opacity-75' : ''} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <motion.span 
          className="text-sm font-medium text-neutral-200"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          key={activeFreq?.label}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {activeFreq?.label || 'Select Frequency'}
        </motion.span>
        
        {activeFreq?.value && (
          <motion.span 
            className="text-xs font-medium py-0.5 px-2 rounded-full bg-neutral-800/80 text-neutral-300"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={activeFreq?.value}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {activeFreq?.value} Hz
          </motion.span>
        )}
      </div>

      <div className="relative pt-1 pb-4">
      <input
          ref={sliderRef}
        id="frequency-slider"
        type="range"
        min="0"
        max={availableFrequencies.length - 1}
        step="1"
        value={selectedIndex >= 0 ? selectedIndex : 0}
        onChange={handleSliderChange}
        disabled={disabled}
          className="w-full h-1.5 appearance-none cursor-pointer rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-400/30 transition-all duration-200"
          style={{ 
            background: sliderBackground,
            WebkitAppearance: 'none',
          }}
      />
      
        {/* Tick marks */}
        <div className="absolute w-full flex justify-between px-[2px] mt-1.5">
          {availableFrequencies.map((freq, index) => (
            <motion.div
              key={index}
              className={`w-1 h-1 rounded-full ${
                index <= selectedIndex 
                  ? 'bg-blue-500/70' 
                  : 'bg-neutral-600/40'
              }`}
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: index === selectedIndex ? 1.3 : 1,
                backgroundColor: index === selectedIndex ? 'rgb(59, 130, 246, 0.9)' : ''
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
        
        {/* Labels */}
        <div className="absolute w-full flex justify-between text-[10px] text-neutral-400 px-0 top-5">
          <span className="transform -translate-x-1/2">
            {availableFrequencies[0].label}
          </span>
          <span className="transform translate-x-1/2">
            {availableFrequencies[availableFrequencies.length - 1].label}
          </span>
        </div>
    </div>
    </motion.div>
  );
};

export default FrequencySlider;
