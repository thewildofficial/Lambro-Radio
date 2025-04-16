'use client';

import { useState, useEffect, useRef } from 'react';

interface VolumeControlProps {
    volume: number;
    onChange: (volume: number) => void;
}

const VolumeControl = ({ volume, onChange }: VolumeControlProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const width = rect.width;
        const left = rect.left;
        let newVolume = (clientX - left) / width;
        
        // Clamp value between 0 and 1
        newVolume = Math.max(0, Math.min(1, newVolume));
        onChange(newVolume);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleMove(e.clientX);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
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
    }, [isDragging, onChange]);

    return (
        <div 
            ref={sliderRef}
            className="relative w-24 h-1 bg-gray-600 rounded-full cursor-pointer"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div 
                className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${volume * 100}%` }}
            />
            <div 
                className="absolute w-3 h-3 bg-white rounded-full -mt-1 transition-all duration-100 transform hover:scale-110"
                style={{ 
                    left: `${volume * 100}%`,
                    transform: `translateX(-50%) ${isDragging ? 'scale(1.2)' : ''}`
                }}
            />
        </div>
    );
};

export default VolumeControl;