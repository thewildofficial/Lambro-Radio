'use client';

import React from 'react';

import { MusicalNoteIcon, SparklesIcon, AdjustmentsHorizontalIcon, ClockIcon, ClipboardDocumentIcon, PlayIcon } from '@heroicons/react/24/outline';

const About: React.FC = () => (
  <section className="mt-12 px-8 py-10 bg-gradient-to-b from-gray-800 to-gray-850 rounded-2xl shadow-xl space-y-8 text-gray-300 ring-1 ring-indigo-700/50">
    <h2 className="text-3xl font-bold text-indigo-400 text-center">Welcome to Lambro Radio</h2>
    
    <p className="text-lg max-w-3xl mx-auto text-center leading-relaxed">
      Explore your favorite music in a new light. Lambro Radio lets you take any track from YouTube and instantly retune its base frequency (like A4) to various standards, including 432 Hz, the standard 440 Hz, and the intriguing Solfeggio frequencies. You can also adjust the tempo to hear it slowed down or sped up.
    </p>

    {/* Quick Start Steps for Normies */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-6">
      <div className="flex flex-col items-center text-center">
        <ClipboardDocumentIcon className="w-8 h-8 text-indigo-400 mb-2" />
        <h4 className="text-sm font-semibold text-gray-200">Paste URL</h4>
      </div>
      <div className="flex flex-col items-center text-center">
        <AdjustmentsHorizontalIcon className="w-8 h-8 text-indigo-400 mb-2" />
        <h4 className="text-sm font-semibold text-gray-200">Set Frequency</h4>
      </div>
      <div className="flex flex-col items-center text-center">
        <ClockIcon className="w-8 h-8 text-indigo-400 mb-2" />
        <h4 className="text-sm font-semibold text-gray-200">Load & Tune</h4>
      </div>
      <div className="flex flex-col items-center text-center">
        <PlayIcon className="w-8 h-8 text-indigo-400 mb-2" />
        <h4 className="text-sm font-semibold text-gray-200">Play & Enjoy</h4>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8 pt-4 max-w-4xl mx-auto">
      
      {/* How it Works Section */}
      <div className="bg-gray-700/50 p-6 rounded-xl ring-1 ring-gray-600/50">
        <h3 className="text-xl font-semibold text-indigo-300 mb-3 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-6 h-6" />
          How It Works (Simply Put)
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li><span className="font-medium text-gray-200">Paste a YouTube URL:</span> Find a song you like on YouTube and copy its web address.</li>
          <li><span className="font-medium text-gray-200">Choose Your Settings:</span> Use the elegant slider to select a target frequency (like 432 Hz or a Solfeggio tone) and adjust the tempo slider if desired.</li>
          <li><span className="font-medium text-gray-200">Load & Process:</span> Hit "Load Audio". Our backend fetches the audio and carefully retunes/respeeds it.</li>
          <li><span className="font-medium text-gray-200">Listen & Explore:</span> Press play! Experience the music with its new sonic character. You can share or download the result.</li>
        </ol>
      </div>

      {/* Why Retune Section */}
      <div className="bg-gray-700/50 p-6 rounded-xl ring-1 ring-gray-600/50">
        <h3 className="text-xl font-semibold text-indigo-300 mb-3 flex items-center gap-2">
          <MusicalNoteIcon className="w-6 h-6" />
          Why Retune Music?
        </h3>
        <p className="text-gray-400 mb-3">
          Most modern music uses A4=440 Hz as the standard tuning pitch. However, other standards like A4=432 Hz have historical roots and are preferred by some listeners for a potentially warmer or different feel.
        </p>
        <p className="text-gray-400">
          The <span className="font-medium text-indigo-300">Solfeggio frequencies</span> (396 Hz, 417 Hz, 528 Hz, etc.) are a set of specific tones that some find interesting to explore for focus, relaxation, or meditation. Lambro Radio makes it easy to experiment and see how these different tunings affect your perception of the music.
        </p>
      </div>

    </div>

    {/* AI Magic & Inspiration */}
    <div className="text-center pt-6 border-t border-gray-700 max-w-3xl mx-auto">
       <h3 className="text-xl font-semibold text-indigo-300 mb-3 flex items-center justify-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          AI Magic Preset & Inspiration
        </h3>
      <p className="text-gray-400">
        Try our <span className="font-semibold text-yellow-400">AI Magic ⚡</span> button for a quick transformation inspired by the vibes of DejaRu22's <a href="https://www.youtube.com/@LambrosRadio/videos" target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline hover:text-indigo-200">Lambros Radio YouTube Channel</a> – typically retuning to 528 Hz, slowing the tempo, and adding a touch of reverb (effect coming soon!).
      </p>
    </div>

  </section>
);

export default About;
