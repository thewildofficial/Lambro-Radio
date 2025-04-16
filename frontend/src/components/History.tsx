'use client';

import React, { useState, useEffect } from 'react';

interface HistoryItem {
  url: string;
  freq: number | null;
  title: string;
  timestamp: number;
}

interface HistoryProps {
  onSelect: (url: string, freq: number | null) => void;
}

const History: React.FC<HistoryProps> = ({ onSelect }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('lambro_history');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const handleClear = () => {
    localStorage.removeItem('lambro_history');
    setHistory([]);
  };

  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-lg space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">History</h4>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-400">Clear</button>
      </div>
      <ul className="max-h-40 overflow-y-auto space-y-1">
        {history.length === 0 && (
          <li className="text-gray-500 text-sm">No history yet.</li>
        )}
        {history.map((item, idx) => (
          <li key={idx} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
            <button
              className="text-white hover:text-indigo-300 flex-grow text-left"
              onClick={() => onSelect(item.url, item.freq)}
            >
              {item.title || item.url} ({item.freq === null ? 'Original' : item.freq + 'Hz'})
            </button>
            <span className="text-xs text-gray-400">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default History;
