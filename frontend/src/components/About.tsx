'use client';

import React from 'react';
import { 
  MusicalNoteIcon, 
  SparklesIcon, 
  AdjustmentsHorizontalIcon, 
  ClockIcon, 
  ClipboardDocumentIcon, 
  PlayIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

const About: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
  
  return (
    <section className="mt-12 px-8 py-10 bg-gradient-to-b from-gray-800/70 via-gray-800/60 to-gray-900/70 rounded-2xl shadow-xl text-gray-300 backdrop-blur-sm border border-gray-700/50 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
      
      <div className="space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-indigo-900/50 to-violet-900/50 backdrop-blur-md rounded-full border border-indigo-500/20 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">Audio Reimagined</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-violet-400 mb-2">Welcome to Lambro Radio</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-indigo-500/50 to-violet-500/50 rounded-full mb-6"></div>
          
          <p className="text-lg max-w-3xl mx-auto text-center leading-relaxed">
            Explore your favorite music in a new light. Lambro Radio lets you take any track from YouTube and instantly retune its base frequency (like A4) to various standards, including 432 Hz, the standard 440 Hz, and the intriguing Solfeggio frequencies. You can also adjust the tempo to hear it slowed down or sped up.
          </p>
        </div>
  
        {/* Quick Start Steps for Normies */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-6">
          {[
            { icon: <ClipboardDocumentIcon className="w-8 h-8" />, label: "Paste URL" },
            { icon: <AdjustmentsHorizontalIcon className="w-8 h-8" />, label: "Set Frequency" },
            { icon: <ClockIcon className="w-8 h-8" />, label: "Load & Tune" },
            { icon: <PlayIcon className="w-8 h-8" />, label: "Play & Enjoy" }
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-gray-600/50 shadow-lg flex items-center justify-center mb-3 group-hover:border-indigo-500/50 transition-all duration-300 transform group-hover:scale-105 group-hover:rotate-3">
                <div className="text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  {step.icon}
                </div>
              </div>
              <h4 className="text-sm font-semibold text-gray-200">{step.label}</h4>
              <span className="text-xs text-gray-500 mt-1">Step {index + 1}</span>
            </div>
          ))}
        </div>
  
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="grid md:grid-cols-2 gap-8 pt-4 max-w-4xl mx-auto">
            
            {/* How it Works Section */}
            <div className="card-glass p-6">
              <h3 className="text-xl font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-6 h-6" />
                How It Works (Simply Put)
              </h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                {[
                  { bold: "Paste a YouTube URL:", text: "Find a song you like on YouTube and copy its web address." },
                  { bold: "Choose Your Settings:", text: "Use the elegant slider to select a target frequency (like 432 Hz or a Solfeggio tone) and adjust the tempo slider if desired." },
                  { bold: "Load & Process:", text: "Hit \"Load Audio\". Our backend fetches the audio and carefully retunes/respeeds it." },
                  { bold: "Listen & Explore:", text: "Press play! Experience the music with its new sonic character. You can share or download the result." }
                ].map((step, index) => (
                  <li key={index} className="group flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-900/50 text-xs font-bold text-indigo-300 flex-shrink-0 mt-0.5">{index + 1}</span>
                    <div>
                      <span className="font-medium text-gray-200">{step.bold}</span> {step.text}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
  
            {/* Why Retune Section */}
            <div className="card-glass p-6">
              <h3 className="text-xl font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <MusicalNoteIcon className="w-6 h-6" />
                Why Retune Music?
              </h3>
              <p className="text-gray-400 mb-4">
                Most modern music uses A4=440 Hz as the standard tuning pitch. However, other standards like A4=432 Hz have historical roots and are preferred by some listeners for a potentially warmer or different feel.
              </p>
              
              <div className="relative p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/20 mb-3">
                <div className="absolute -top-3 -left-1">
                  <span className="px-2 py-0.5 bg-indigo-500/20 rounded-md text-xs font-semibold text-indigo-300">Highlight</span>
                </div>
                <p className="text-gray-300">
                  The <span className="font-medium text-indigo-300">Solfeggio frequencies</span> (396 Hz, 417 Hz, 528 Hz, etc.) are a set of specific tones that some find interesting to explore for focus, relaxation, or meditation. Lambro Radio makes it easy to experiment and see how these different tunings affect your perception of the music.
                </p>
              </div>
            </div>
          </div>
  
          {/* AI Magic & Inspiration */}
          <div className="text-center pt-8 border-t border-gray-700/50 max-w-3xl mx-auto mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/20 mb-4">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-300">AI Magic Preset & Inspiration</h3>
            </div>
            <p className="text-gray-400">
              Try our <span className="font-semibold text-yellow-400">AI Magic ⚡</span> button for a quick transformation inspired by the vibes of DejaRu22&apos;s <a href="https://www.youtube.com/@LambrosRadio/videos" target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline hover:text-indigo-200 transition-colors">Lambros Radio YouTube Channel</a> – typically retuning to 528 Hz, slowing the tempo, and adding a touch of reverb (effect coming soon!).
            </p>
          </div>
        </div>
        
        {/* Toggle button */}
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            <span>{expanded ? 'Show Less' : 'Learn More'}</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default About;
