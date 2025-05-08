"use client";

import React from 'react';

const AppHeader: React.FC = () => {
  return (
    <header className="w-full py-4 px-4 md:px-8 flex items-center justify-between mb-4 md:mb-8">
      <h1 
        className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r"
        style={{
          backgroundImage: `linear-gradient(to right, var(--theme-header-gradient-from, #a855f7), var(--theme-header-gradient-to, #fb923c))`
        }}
      >
        Lambro Radio
      </h1>
      <div className="flex items-center space-x-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium text-green-400">LIVE</span>
      </div>
    </header>
  );
};

export default AppHeader; 