'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MusicalNoteIcon, SparklesIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const About: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="bg-apple-bg-secondary border-apple-border-primary text-apple-text-primary shadow-md">
      <CardHeader className="items-center text-center">
        <div className="inline-flex items-center mb-2">
          <MusicalNoteIcon className="w-8 h-8 text-apple-accent-blue mr-2" />
          <CardTitle className="text-2xl font-semibold text-apple-text-primary">
            Lambro Radio
          </CardTitle>
        </div>
        <CardDescription className="text-apple-text-secondary max-w-xl leading-relaxed">
          Tune your favorite YouTube tracks to different frequencies like 432 Hz or Solfeggio tones. Adjust tempo and rediscover your music.
        </CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 text-apple-text-secondary text-sm space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-apple-text-primary mb-2 flex items-center justify-center gap-2">
              <SparklesIcon className="w-5 h-5 text-apple-accent-yellow" />
              AI Magic Preset
            </h3>
            <p>
              Try the <span className="font-semibold text-apple-accent-yellow">AI Magic ⚡</span> button in the player for a quick transformation inspired by Lambros Radio, often using 528 Hz and a slower tempo.
            </p>
          </div>
          <div className="text-left bg-apple-bg-tertiary p-4 rounded-apple-sm">
            <h4 className="font-medium text-apple-text-primary mb-1">How it Works:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Paste a YouTube URL into the player.</li>
              <li>Select your desired frequency and tempo.</li>
              <li>Click "Load Audio" to process.</li>
              <li>Play and enjoy the retuned track!</li>
            </ol>
          </div>
          <p className="text-xs text-apple-text-tertiary text-center pt-2">
            Lambro Radio allows exploration of different tuning standards. Most music is A4=440Hz; 432Hz and Solfeggio frequencies offer alternative listening experiences.
          </p>
        </CardContent>
      )}

      <CardFooter className="flex justify-center pt-4 border-t border-apple-border-primary">
        <Button 
          variant="outline_apple" 
          size="sm" // Using a standard sm size, can create apple specific if needed
          onClick={() => setExpanded(!expanded)}
          className="text-apple-accent-blue hover:text-apple-accent-blue/80"
        >
          <span className="mr-1">{expanded ? 'Show Less' : 'Learn More'}</span>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default About;
