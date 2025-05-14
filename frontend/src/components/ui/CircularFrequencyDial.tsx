"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// This default is now overridden by the prop from PlayerSection, which includes 0 for default.
// const SOLFEGGIO_FREQUENCIES = [
//   174, 285, 396, 417, 528, 639, 741, 852, 963,
// ];

const DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION = 0;
const DEFAULT_FREQUENCY_LABEL = "Default";

interface CircularFrequencyDialProps {
  id?: string;
  value?: number | "default";
  onChange?: (frequency: number | "default") => void;
  className?: string;
  size?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  carouselApi?: any;
  handlePresetChange?: (value: number | "default") => void;
  selectedPresetValue?: number | "default";
}

const CircularFrequencyDial: React.FC<CircularFrequencyDialProps> = ({
  id,
  value = "default",
  onChange,
  className = "",
  size = 220, // Slightly smaller default size for better proportions
  min = 174,
  max = 963,
  step = 1,
  disabled = false,
  carouselApi,
  handlePresetChange,
  selectedPresetValue,
}) => {
  // Define our frequency presets
  const frequencies = [DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION, min, 285, 396, 417, 528, 639, 741, 852, max];
  
  // Calculate angles
  const numSteps = frequencies.length;
  const anglePerStep = 360 / numSteps;
  const START_ANGLE_OFFSET = -90; // Top = 0 degrees
  
  // Convert external value (number | "default") to internal value (number)
  const getInternalValue = useCallback((externalValue: number | "default") => {
    return externalValue === "default" ? DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION : externalValue;
  }, []);
  
  // Convert internal value (number) to external value (number | "default")
  const getExternalValue = useCallback((internalValue: number) => {
    return internalValue === DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION ? "default" : internalValue;
  }, []);
  
  // Get index of a frequency in our preset list
  const getFrequencyIndex = useCallback((freq: number) => {
    const index = frequencies.indexOf(freq);
    return index === -1 ? 0 : index;
  }, [frequencies]);
  
  // Convert frequency to rotation angle
  const frequencyToAngle = useCallback((freq: number) => {
      const index = getFrequencyIndex(freq);
      return index * anglePerStep + START_ANGLE_OFFSET;
  }, [getFrequencyIndex, anglePerStep, START_ANGLE_OFFSET]);

  // Calculate frequency and angle from a given target angle
  const angleToFrequencyAndAngle = useCallback((targetAngle: number) => {
      let normalizedAngle = (targetAngle - START_ANGLE_OFFSET + 360) % 360;
      const closestStepIndex = Math.round(normalizedAngle / anglePerStep) % numSteps;
    const snappedFrequency = frequencies[closestStepIndex];
      const snappedAngle = closestStepIndex * anglePerStep + START_ANGLE_OFFSET;
      return { frequency: snappedFrequency, angle: snappedAngle };
  }, [anglePerStep, numSteps, frequencies, START_ANGLE_OFFSET]);

  // Set up state for the dial
  const internalValue = getInternalValue(value);
  const [currentFrequency, setCurrentFrequency] = useState(internalValue);
  const [angle, setAngle] = useState(frequencyToAngle(internalValue));
  const [isDragging, setIsDragging] = useState(false);
  const [hoverState, setHoverState] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  // Update state when props change
  useEffect(() => {
    const newInternalValue = getInternalValue(value);
    if (newInternalValue !== currentFrequency) {
      setCurrentFrequency(newInternalValue);
      setAngle(frequencyToAngle(newInternalValue));
    }
  }, [value, getInternalValue, currentFrequency, frequencyToAngle]);

  // Handle pointer/touch/mouse interaction
  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (disabled || !dialRef.current) return;
    
    try {
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      
      // Only register the drag if it's within the dial radius
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > (rect.width / 2) + 20) return; // Allow slight buffer outside of dial
      
      const rawPointerAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      const { frequency: newFrequency, angle: newAngle } = angleToFrequencyAndAngle(rawPointerAngle);

      if (newFrequency !== currentFrequency) {
        setAngle(newAngle);
        setCurrentFrequency(newFrequency);
        
        if (onChange) {
          onChange(getExternalValue(newFrequency));
        }
      }
    } catch (error) {
      console.error("Error in dial interaction:", error);
      }
  }, [disabled, angleToFrequencyAndAngle, currentFrequency, onChange, getExternalValue]);
  
  // Handle cycling through frequencies with buttons or keyboard
  const cycleFrequency = useCallback((direction: 'next' | 'prev') => {
    if (disabled) return;
    
    try {
      const currentIndex = getFrequencyIndex(currentFrequency);
      const nextIndex = direction === 'next' 
        ? (currentIndex + 1) % numSteps 
        : (currentIndex - 1 + numSteps) % numSteps;
      
      const newFrequency = frequencies[nextIndex];
      const newAngle = frequencyToAngle(newFrequency);
      
      setAngle(newAngle);
      setCurrentFrequency(newFrequency);
      
      if (onChange) {
        onChange(getExternalValue(newFrequency));
      }
    } catch (error) {
      console.error("Error cycling frequency:", error);
    }
  }, [disabled, getFrequencyIndex, currentFrequency, numSteps, frequencies, frequencyToAngle, onChange, getExternalValue]);
  
  // Mouse and touch event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    handleInteraction(e.clientX, e.clientY);
    e.preventDefault();
  }, [disabled, handleInteraction]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    setIsDragging(true);
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, [disabled, handleInteraction]);

  // Set up global event listeners for drag interactions
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    };
    
    const handleEnd = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
    };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, handleInteraction]);
  
  // Calculate sizes
  const outerRingWidth = Math.max(4, size * 0.02);
  const innerDialScale = 0.85;
  const innerDialSize = size * innerDialScale;
  const tickHeight = Math.max(12, size * 0.06);
  const tickWidth = Math.max(2, size * 0.01);
  
  // Get display text
  const displayValue = currentFrequency === DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION 
    ? DEFAULT_FREQUENCY_LABEL 
    : `${currentFrequency} Hz`;
  
  // Handle carousel selection
  useEffect(() => {
    if (!carouselApi) return;
    
    const handleCarouselSelect = () => {
      try {
        const currentSelectedIndex = carouselApi.selectedScrollSnap();
        const newSelectedPreset = frequencies[currentSelectedIndex];
        if (newSelectedPreset && newSelectedPreset !== selectedPresetValue) {
          handlePresetChange(newSelectedPreset);
        }
      } catch (error) {
        console.error("Error in carousel selection:", error);
      }
    };
    
    try {
      carouselApi.on("select", handleCarouselSelect);
      return () => {
        try {
          carouselApi.off("select", handleCarouselSelect);
        } catch (error) {
          console.error("Error removing carousel event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error adding carousel event listener:", error);
      return () => {};
    }
  }, [carouselApi, handlePresetChange, selectedPresetValue, frequencies]);
  
  // Calculate the color based on the current frequency - read from CSS variables for theme consistency
  const getFrequencyThemeColor = () => {
    if (typeof window !== 'undefined') {
      try {
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--theme-accent')?.trim();
        return accentColor || 'hsl(210, 75%, 55%)'; // Enhanced default blue
      } catch (error) {
        console.error("Error getting theme color:", error);
        return 'hsl(210, 75%, 55%)'; // Enhanced fallback
      }
    }
    return 'hsl(210, 75%, 55%)'; // Default for SSR
  };
  
  // CSS variable calculation or fallback to a visually consistent scheme
  const getThemeVariableOrFallback = (variable: string, fallback: string) => {
    if (typeof window !== 'undefined') {
      try {
        const styles = getComputedStyle(document.documentElement);
        return styles.getPropertyValue(variable)?.trim() || fallback;
      } catch (error) {
        return fallback;
      }
    }
    return fallback;
  };

  // Get theme colors with fallbacks
  const frequencyColor = getFrequencyThemeColor();
  // Enhanced color scheme for a premium look
  const bgPrimary = getThemeVariableOrFallback('--theme-card-bg', '#111111'); // Darker for contrast
  const bgSecondary = getThemeVariableOrFallback('--theme-bg-secondary', '#1a1a1a');
  const textPrimary = getThemeVariableOrFallback('--theme-text-primary', '#ffffff');
  const textSecondary = getThemeVariableOrFallback('--theme-text-secondary', '#a1a1aa');
  
  // Enhanced tick color function for a more premium gradient effect
  const getTickColor = (index: number) => {
    const isActive = index === getFrequencyIndex(currentFrequency);
    if (isActive) return frequencyColor;
    
    // Distance from active with enhanced gradient
    const distance = Math.abs(index - getFrequencyIndex(currentFrequency));
    const maxDistance = Math.floor(numSteps / 2);
    const opacity = Math.max(0.15, 1 - (distance / maxDistance) * 0.85);
    
    // Enhanced color for non-active ticks with a subtle metallic look
    return `rgba(255, 255, 255, ${opacity * 0.65})`;
  };
  
  // Calculate a complementary glow color with improved aesthetics
  const getGlowColor = () => {
    if (frequencyColor.startsWith('hsl')) {
      // Extract hue from HSL and create a complementary glow
      try {
        const hue = parseInt(frequencyColor.match(/hsl\(\s*(\d+)/)?.[1] || "210");
        // Return a more premium, subtle glow effect
        return `hsla(${hue}, 85%, 55%, 0.45)`;
      } catch (e) {
        return `${frequencyColor}80`;
      }
    }
    return `${frequencyColor}80`;
  };

  const glowColor = getGlowColor();
  
  // Render the dial
  return (
    <motion.div
      ref={dialRef}
      id={id}
      className={`relative flex flex-col items-center justify-center select-none ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-grab'} ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      onMouseDown={disabled ? undefined : handleMouseDown}
      onTouchStart={disabled ? undefined : handleTouchStart}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={currentFrequency === DEFAULT_FREQUENCY_INTERNAL_REPRESENTATION ? undefined : currentFrequency}
      aria-valuetext={displayValue}
      aria-label="Frequency Dial"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onKeyDown={disabled ? undefined : (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') cycleFrequency('next');
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') cycleFrequency('prev');
      }}
    >
      {/* Premium outer bezel with metallic effect */}
      <motion.div 
        className="absolute w-full h-full rounded-full"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, ${bgSecondary}EE 0%, ${bgPrimary}FF 75%)`,
          boxShadow: `0 8px 30px rgba(0,0,0,0.4), 
                     inset 0 0 0 ${outerRingWidth}px rgba(45,45,50,0.95),
                     inset 0 0 25px rgba(0,0,0,0.6),
                     0 0 10px rgba(0,0,0,0.6)` 
        }}
        animate={{ 
          boxShadow: hoverState || isDragging 
            ? `0 10px 35px rgba(0,0,0,0.45), 
               inset 0 0 0 ${outerRingWidth}px rgba(50,55,60,0.98),
               0 0 25px ${glowColor},
               inset 0 0 30px rgba(0,0,0,0.7)` 
            : `0 8px 30px rgba(0,0,0,0.4), 
               inset 0 0 0 ${outerRingWidth}px rgba(45,45,50,0.95),
               inset 0 0 25px rgba(0,0,0,0.6),
               0 0 10px rgba(0,0,0,0.6)` 
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Premium Tick Marks with better styling */}
        {frequencies.map((_, i) => {
          const tickAngle = i * anglePerStep + START_ANGLE_OFFSET;
          const isActive = i === getFrequencyIndex(currentFrequency);
          
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: isActive ? '3px' : '2px',
                height: isActive ? '16px' : '10px',
                top: '2px',
                left: '50%',
                borderRadius: '2px',
                backgroundColor: getTickColor(i),
                transformOrigin: '50% calc(50vh - 6px)',
                transform: `translateX(-50%) rotate(${tickAngle}deg)`,
                boxShadow: isActive ? `0 0 12px ${frequencyColor}` : 'none',
                transition: 'height 0.2s ease, background-color 0.2s ease, width 0.2s ease, box-shadow 0.3s ease',
              }}
              animate={{
                backgroundColor: getTickColor(i),
                height: isActive ? '16px' : '8px',
                width: isActive ? '3px' : '2px',
                boxShadow: isActive ? `0 0 12px ${frequencyColor}` : 'none',
              }}
              transition={{ duration: 0.3 }}
            />
          );
        })}

        {/* Premium Inner Circle with Apple-like aesthetics */}
        <motion.div
          className="absolute top-1/2 left-1/2 rounded-full flex flex-col items-center justify-center overflow-hidden"
          style={{ 
            width: `${innerDialSize}px`, 
            height: `${innerDialSize}px`,
            transform: 'translate(-50%, -50%)',
            backgroundImage: `radial-gradient(circle at 30% 25%, ${bgSecondary}CC 0%, ${bgPrimary}FF 90%)`,
            boxShadow: `inset 0 2px 6px rgba(255,255,255,0.15), 
                      inset 0 -3px 6px rgba(0,0,0,0.35),
                      0 10px 30px rgba(0,0,0,0.25)` 
          }}
          animate={{ 
            boxShadow: isDragging || hoverState
              ? `inset 0 2px 8px rgba(255,255,255,0.2), 
                 inset 0 -4px 8px rgba(0,0,0,0.45),
                 0 12px 35px rgba(0,0,0,0.3),
                 0 0 30px ${glowColor}` 
              : `inset 0 2px 6px rgba(255,255,255,0.15), 
                 inset 0 -3px 6px rgba(0,0,0,0.35),
                 0 10px 30px rgba(0,0,0,0.25)` 
          }}
          transition={{ duration: 0.25 }}
        >
          <motion.div 
            className="flex flex-col items-center justify-center h-full w-full"
            animate={{
              scale: isDragging ? 1.04 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.span 
              className="text-xs font-medium tracking-wider uppercase"
              style={{ 
                color: textSecondary, 
                letterSpacing: '0.08em', 
                fontSize: '0.65rem', 
                marginBottom: '0.3rem',
                opacity: 0.9
              }}
              animate={{ 
                color: isDragging ? textPrimary : textSecondary,
                opacity: isDragging ? 1 : 0.9,
              }}
            >
              FREQUENCY
            </motion.span>
            
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 5 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isDragging ? 1.06 : 1,
              }}
              key={displayValue}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
            >
              <motion.span 
                className="text-2xl font-bold"
                style={{ 
                  fontSize: displayValue.length > 7 ? `${Math.max(20, size * 0.1)}px` : `${Math.max(24, size * 0.12)}px`,
                  background: `linear-gradient(to bottom, ${textPrimary} -10%, ${textSecondary} 120%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 2px 4px rgba(0,0,0,0.4)`,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
                  fontWeight: '600'
                }}
                animate={{
                  textShadow: isDragging ? `0 0 12px ${glowColor}` : `0 2px 4px rgba(0,0,0,0.4)`,
                }}
              >
                {displayValue}
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Enhanced premium glossy reflection effect */}
          <div 
            className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(255,255,255,0.15) 0%, 
                rgba(255,255,255,0.08) 40%,
                rgba(255,255,255,0.02) 70%,
                rgba(255,255,255,0) 100%)`,
              opacity: 0.8,
            }}
          />
        </motion.div>

        {/* Premium Indicator Needle with improved design */}
        <motion.div 
          className="absolute top-0 left-1/2"
          style={{ 
            transformOrigin: 'center bottom',
            transform: 'translateX(-50%)'
          }}
          animate={{ rotate: angle }}
          transition={{ 
            type: "spring", 
            stiffness: 450, 
            damping: 30
          }}
        >
          <motion.div
            className="flex items-center justify-center"
            animate={{ 
              backgroundColor: frequencyColor,
              boxShadow: `0 0 10px ${glowColor}`,
            }}
            style={{
              width: '4px',
              height: '20px',
              borderRadius: '4px 4px 1px 1px',
              backgroundImage: `linear-gradient(to bottom, ${frequencyColor}FF, ${frequencyColor}AA)`,
              boxShadow: `0 3px 6px rgba(0,0,0,0.6), 0 0 10px ${glowColor}`,
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </motion.div>

      {/* Premium pulsing glow effect on active state */}
      {(hoverState || isDragging) && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'transparent',
          }}
          animate={{
            boxShadow: isDragging 
              ? [
                  `0 0 18px ${glowColor}`, 
                  `0 0 25px ${glowColor}`, 
                  `0 0 18px ${glowColor}`
                ]
              : `0 0 18px ${glowColor}`,
          }}
          transition={{
            repeat: isDragging ? Infinity : 0,
            duration: 1.5,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
};

export default CircularFrequencyDial; 