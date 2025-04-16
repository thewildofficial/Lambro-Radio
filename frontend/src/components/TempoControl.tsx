'use client';

import { useState, useEffect, useRef } from 'react';

interface TempoControlProps {
    tempo: number;
    onChange: (tempo: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const TempoControl = ({ 
    tempo, 
    onChange,
    min = 0.5,
    max = 2.0,
    step = 0.1
}: TempoControlProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showValue, setShowValue] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const normalize = (value: number) => {
        return (value - min) / (max - min);
    };

    const denormalize = (normalized: number) => {
        return normalized * (max - min) + min;
    };

    const handleMove = (clientX: number) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const width = rect.width;
        const left = rect.left;
        let normalized = (clientX - left) / width;
        normalized = Math.max(0, Math.min(1, normalized));
        
        // Convert to tempo value and apply stepping
        let newTempo = denormalize(normalized);
        newTempo = Math.round(newTempo / step) * step;
        newTempo = Math.max(min, Math.min(max, newTempo));
        
        onChange(newTempo);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setShowValue(true);
        handleMove(e.clientX);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setShowValue(true);
        handleMove(e.touches[0].clientX);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            handleMove(e.clientX);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            handleMove(e.touches[0].clientX);
        };

        const handleEnd = () => {
            setIsDragging(false);
            setTimeout(() => setShowValue(false), 1000);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);

    return (
        <div className="relative group">
            <div 
                ref={sliderRef}
                className="relative w-32 h-1 bg-gray-600 rounded-full cursor-pointer"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onMouseEnter={() => setShowValue(true)}
                onMouseLeave={() => !isDragging && setShowValue(false)}
            >
                <div 
                    className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all duration-100"
                    style={{ width: `${normalize(tempo) * 100}%` }}
                />
                <div 
                    className="absolute w-3 h-3 bg-white rounded-full -mt-1 transition-all duration-100 hover:scale-110"
                    style={{ 
                        left: `${normalize(tempo) * 100}%`,
                        transform: `translateX(-50%) ${isDragging ? 'scale(1.2)' : ''}`
                    }}
                />
            </div>
            
            {/* Value tooltip */}
            <div 
                className={`absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs transition-opacity duration-200 ${
                    showValue || isDragging ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {tempo.toFixed(1)}x
            </div>
        </div>
    );
};

export default TempoControl;