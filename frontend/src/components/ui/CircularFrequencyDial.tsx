"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const SOLFEGGIO_FREQUENCIES = [
  174, 285, 396, 417, 528, 639, 741, 852, 963,
];

interface CircularFrequencyDialProps {
  initialFrequency?: number;
  onFrequencyChange?: (frequency: number) => void;
  className?: string;
  size?: number;
  solfeggioFrequencies?: number[];
}

const CircularFrequencyDial: React.FC<CircularFrequencyDialProps> = ({
  initialFrequency = 528,
  onFrequencyChange,
  className = "",
  size = 256,
  solfeggioFrequencies = SOLFEGGIO_FREQUENCIES,
}) => {
  const numSteps = solfeggioFrequencies.length;
  const anglePerStep = 360 / numSteps;
  const START_ANGLE_OFFSET = -90; // Makes 0 degrees visually top

  const findClosestFrequency = useCallback((targetFreq: number) => {
    return solfeggioFrequencies.reduce((prev, curr) => 
      Math.abs(curr - targetFreq) < Math.abs(prev - targetFreq) ? curr : prev
    );
  }, [solfeggioFrequencies]);

  const getFrequencyIndex = useCallback((freq: number) => {
    return solfeggioFrequencies.indexOf(findClosestFrequency(freq));
  }, [solfeggioFrequencies, findClosestFrequency]);
  
  const frequencyToAngle = useCallback(
    (freq: number) => {
      const index = getFrequencyIndex(freq);
      if (index === -1) return START_ANGLE_OFFSET;
      return index * anglePerStep + START_ANGLE_OFFSET;
    },
    [getFrequencyIndex, anglePerStep, START_ANGLE_OFFSET]
  );

  const angleToFrequencyAndAngle = useCallback(
    (targetAngle: number) => {
      let normalizedAngle = (targetAngle - START_ANGLE_OFFSET + 360) % 360;
      const closestStepIndex = Math.round(normalizedAngle / anglePerStep) % numSteps;
      const snappedFrequency = solfeggioFrequencies[closestStepIndex];
      const snappedAngle = closestStepIndex * anglePerStep + START_ANGLE_OFFSET;
      return { frequency: snappedFrequency, angle: snappedAngle };
    },
    [anglePerStep, numSteps, solfeggioFrequencies, START_ANGLE_OFFSET]
  );

  const [currentFrequency, setCurrentFrequency] = useState(findClosestFrequency(initialFrequency));
  const [angle, setAngle] = useState(frequencyToAngle(currentFrequency));
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newFreq = findClosestFrequency(initialFrequency);
    setCurrentFrequency(newFreq);
    setAngle(frequencyToAngle(newFreq));
  }, [initialFrequency, findClosestFrequency, frequencyToAngle]);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      let rawPointerAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      const { frequency: newFrequency, angle: newAngle } = angleToFrequencyAndAngle(rawPointerAngle);

      if (newFrequency !== currentFrequency) {
        setAngle(newAngle);
        setCurrentFrequency(newFrequency);
        if (onFrequencyChange) {
          onFrequencyChange(newFrequency);
        }
      }
    },
    [angleToFrequencyAndAngle, onFrequencyChange, currentFrequency]
  );
  
  const cycleFrequency = (direction: 'next' | 'prev') => {
    const currentIndex = getFrequencyIndex(currentFrequency);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % numSteps;
    } else {
      nextIndex = (currentIndex - 1 + numSteps) % numSteps;
    }
    const newFrequency = solfeggioFrequencies[nextIndex];
    setAngle(frequencyToAngle(newFrequency));
    setCurrentFrequency(newFrequency);
    if (onFrequencyChange) onFrequencyChange(newFrequency);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    handleInteraction(e.clientX, e.clientY);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleInteraction(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        setAngle(frequencyToAngle(currentFrequency)); 
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);
    } 

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, handleInteraction, currentFrequency, frequencyToAngle]);

  const dialSize = size;
  const innerDialScale = 0.78;
  const innerDialSize = dialSize * innerDialScale;
  const innerDialRadius = innerDialSize / 2;
  const tickHeight = Math.max(14, dialSize * 0.08);
  const tickWidth = Math.max(3, dialSize * 0.018);
  const tickOffset = innerDialRadius - (tickHeight * 0.5);

  return (
    <div
      ref={dialRef}
      className={`relative flex flex-col items-center justify-center select-none cursor-grab ${className}`}
      style={{ width: `${dialSize}px`, height: `${dialSize}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-valuemin={solfeggioFrequencies[0]}
      aria-valuemax={solfeggioFrequencies[solfeggioFrequencies.length - 1]}
      aria-valuenow={currentFrequency}
      aria-valuetext={`${currentFrequency} Hz`}
      aria-label="Solfeggio Frequency Dial"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') cycleFrequency('next');
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') cycleFrequency('prev');
      }}
    >
      {/* Outer Ring - Deep, slightly desaturated dark grey */}
      <div className="absolute w-full h-full rounded-full bg-neutral-800 shadow-xl">
        {/* Inner Circle - Softer gradient, more subtle 3D effect */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center text-center
                     bg-gradient-to-br from-neutral-500 via-neutral-600 to-neutral-700 
                     shadow-[inset_0_4px_8px_rgba(0,0,0,0.3),_inset_0_-3px_6px_rgba(255,255,255,0.08)]"
          style={{ width: `${innerDialSize}px`, height: `${innerDialSize}px` }}
        >
          <span className="text-xs text-neutral-300/90 leading-tight">Return</span>
          <span className="text-xs text-neutral-300/90 leading-tight mb-0.5">Frequency</span>
          <span 
            className="text-3xl font-medium text-neutral-100 mt-0.5"
            style={{ fontSize: `${Math.max(18, dialSize * 0.11)}px`}}
          >
            {currentFrequency} Hz
          </span>
        </div>

        {/* Tick Mark Orbiting Container */}
        <motion.div 
          className="absolute inset-0 rounded-full"
          style={{ transformOrigin: 'center center' }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          {/* The Actual Tick Mark - Positioned at the top edge of the container */}
          <div
            className="absolute bg-white rounded-[2px] shadow-sm"
            style={{
              width: `${tickWidth}px`,
              height: `${tickHeight}px`,
              top: `${(dialSize - innerDialSize)/2 + (tickHeight * 0.1)}px`,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          ></div>
        </motion.div>
      </div>
    </div>
  );
};

export default CircularFrequencyDial; 