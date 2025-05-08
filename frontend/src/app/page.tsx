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
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut", delay },
  });

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-200 font-sans flex flex-col items-center p-4 md:p-6 selection:bg-sky-500 selection:text-white">
      <AppHeader />

      <motion.div 
        className="w-full max-w-2xl mb-8 px-1 md:px-0"
        {...sectionAnimationProps(0)}
      >
        <div className="flex items-center space-x-2 bg-neutral-800/70 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border border-neutral-700/50">
          <Link2 className="w-5 h-5 text-neutral-400 flex-shrink-0 ml-1" />
          <Input 
            type="text" 
            placeholder="Paste YouTube Music or YouTube video URL here..." 
            className="flex-grow bg-transparent border-none focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 placeholder-neutral-500 text-neutral-200 text-sm p-0 h-auto"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          <Button 
            onClick={handleLoadAudio}
            className="bg-neutral-700 hover:bg-neutral-600/90 text-neutral-100 text-sm px-4 py-2 h-auto rounded-lg shadow-md border border-neutral-600/80 active:bg-neutral-600 transition-colors duration-150"
          >
            Load Audio
          </Button>
        </div>
      </motion.div>

      <motion.div 
        className="w-full"
        {...sectionAnimationProps(0.1)}
      >
        <PlayerSection />
      </motion.div>
      
      <div className="w-full max-w-2xl mt-10 md:mt-12 grid md:grid-cols-2 gap-6 md:gap-8 px-1 md:px-0">
        <motion.div {...sectionAnimationProps(0.2)} >
          <Card className="bg-neutral-800/70 backdrop-blur-sm border-neutral-700/60 text-neutral-50 shadow-xl h-full rounded-xl">
            <CardHeader>
              <CardTitle className="text-neutral-100 text-lg font-semibold">Why Retune Music?</CardTitle>
            </CardHeader>
            <CardContent className="text-neutral-300 text-sm space-y-2">
              <p>Exploring alternative tunings can shift musical perspectives, potentially evoking different emotional responses and offering fresh ways to experience familiar melodies.</p>
              <p>Many believe specific frequencies resonate more harmoniously with natural vibrations, offering unique sonic experiences.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...sectionAnimationProps(0.3)} >
          <Card className="bg-neutral-800/70 backdrop-blur-sm border-neutral-700/60 text-neutral-50 shadow-xl h-full rounded-xl">
            <CardHeader>
              <CardTitle className="text-neutral-100 text-lg font-semibold">The Solfeggio Frequencies</CardTitle>
            </CardHeader>
            <CardContent className="text-neutral-300 text-sm space-y-2">
              <p>A set of historical tones, including 417 Hz (Facilitating Change) and 528 Hz (Transformation & Miracles), are central to various spiritual and wellness practices.</p>
              <p>These frequencies are often explored for their purported benefits to mind, body, and overall well-being.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <footer className="text-center py-8 mt-8 text-neutral-500 text-xs">
        Lambro Radio - Experience Music Differently
      </footer>
    </main>
  );
}
