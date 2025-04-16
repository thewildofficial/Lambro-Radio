'use client';

import React, { useState, useEffect } from 'react';

interface Preset {
  name: string;
  frequency: number | null;
}

interface PresetManagerProps {
  currentFrequency: number | null;
  onSelect: (freq: number | null) => void;
}

const PresetManager: React.FC<PresetManagerProps> = ({ currentFrequency, onSelect }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('lambro_presets');
    if (stored) {
      setPresets(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lambro_presets', JSON.stringify(presets));
  }, [presets]);

  const handleSave = () => {
    if (!presetName) return;
    const newPreset: Preset = { name: presetName, frequency: currentFrequency };
    setPresets([...presets, newPreset]);
    setPresetName('');
  };

  const handleRemove = (index: number) => {
    const newList = [...presets];
    newList.splice(index, 1);
    setPresets(newList);
  };

  return (
    <div className="mt-8 p-4 bg-gray-800 rounded-lg space-y-2">
      <h4 className="text-lg font-semibold text-white">Presets</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Preset name"
          className="flex-grow p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleSave}
          disabled={!presetName}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          Save
        </button>
      </div>
      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
        {presets.map((p, idx) => (
          <li key={idx} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
            <button
              className="text-left flex-grow text-white hover:text-indigo-300"
              onClick={() => onSelect(p.frequency)}
            >
              {p.name} ({p.frequency ?? 'Original'} Hz)
            </button>
            <button
              onClick={() => handleRemove(idx)}
              className="text-red-500 hover:text-red-400 ml-2"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PresetManager;
