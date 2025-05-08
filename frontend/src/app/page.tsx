"use client";

import React from 'react';
import AppHeader from '@/components/AppHeader';
import PlayerSection from '@/components/PlayerSection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2 } from 'lucide-react';
import { motion } from "framer-motion";

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = React.useState('');

  const handleLoadAudio = () => {
    console.log('Loading audio from:', youtubeUrl);
    // TODO: Implement actual audio loading and processing logic
  };

  const sectionAnimationProps = (delay = 0) => ({
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1.05], delay },
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col items-center p-4 md:p-8 selection:bg-sky-400 selection:text-white">
      <AppHeader />

      <motion.div 
        className="w-full max-w-3xl mb-8 md:mb-10 px-1 md:px-0"
        {...sectionAnimationProps(0)}
      >
        <div className="flex items-center space-x-2.5 bg-neutral-800/60 backdrop-blur-md p-3 rounded-xl shadow-xl border border-neutral-700/50">
          <Link2 className="w-5 h-5 text-neutral-400 flex-shrink-0 ml-1.5" />
          <Input 
            type="text" 
            placeholder="Enter YouTube Music or Video URL to begin..."
            className="flex-grow bg-transparent border-none focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 placeholder-neutral-500 text-neutral-100 text-base p-1 h-auto"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          <Button 
            onClick={handleLoadAudio}
            className="bg-neutral-700 hover:bg-neutral-600/90 text-neutral-50 text-sm px-4 py-2 h-auto rounded-lg shadow-md active:bg-neutral-600 transition-all duration-150 ease-out border border-neutral-600/70 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            Load Audio
          </Button>
        </div>
      </motion.div>

      <motion.div 
        className="w-full max-w-3xl"
        {...sectionAnimationProps(0.1)}
      >
        <PlayerSection />
      </motion.div>
      
      <div className="w-full max-w-3xl mt-10 md:mt-14 grid md:grid-cols-2 gap-6 md:gap-8 px-1 md:px-0">
        <motion.div {...sectionAnimationProps(0.2)} className="h-full">
          <Card className="bg-neutral-800/60 backdrop-blur-md border-neutral-700/50 text-neutral-100 shadow-xl h-full rounded-2xl p-2">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-neutral-50 text-lg font-semibold">Why Retune Music?</CardTitle>
            </CardHeader>
            <CardContent className="text-neutral-300 text-sm space-y-2.5 px-5 pb-5">
              <p>Standard tuning (A=440Hz) is just one possibility. Exploring alternatives, like A=432Hz or Solfeggio frequencies, offers a unique sonic landscape.</p>
              <p>Discover how different tunings can alter musical perception, evoke distinct emotions, and resonate uniquely with natural vibrations.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...sectionAnimationProps(0.3)} className="h-full">
          <Card className="bg-neutral-800/60 backdrop-blur-md border-neutral-700/50 text-neutral-100 shadow-xl h-full rounded-2xl p-2">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-neutral-50 text-lg font-semibold">The Solfeggio Frequencies</CardTitle>
            </CardHeader>
            <CardContent className="text-neutral-300 text-sm space-y-2.5 px-5 pb-5">
              <p>This ancient scale includes tones like 417 Hz (Facilitating Change) and 528 Hz (Transformation & Miracles), revered in wellness and spiritual practices.</p>
              <p>Experience these frequencies, believed by many to possess unique properties that can positively influence mind, body, and spirit.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <footer className="text-center py-8 md:py-10 mt-8 md:mt-10 text-neutral-600 text-xs">
        © 2024 Lambro Radio. Tune into different vibrations.
      </footer>
    </main>
  );
}
