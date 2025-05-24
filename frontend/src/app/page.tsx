"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import PlayerSection from '@/components/PlayerSection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from 'lucide-react';
import { motion } from "framer-motion";
import Image from 'next/image';

interface AudioInfo {
  audio_stream_url: string;
  title: string;
  duration: number;
  thumbnail_url?: string;
}

const PageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedFrequency, setSharedFrequency] = useState<number | "default" | null>(null);
  const [loadedFromShareLink, setLoadedFromShareLink] = useState(false);

  useEffect(() => {
    const videoIdParam = searchParams.get('yt');
    const freqParam = searchParams.get('freq');

    if (videoIdParam && !loadedFromShareLink) {
      const incomingUrl = `https://www.youtube.com/watch?v=${videoIdParam}`;
      console.log('[page.tsx] useEffect (URL Params): Found videoIdParam, setting youtubeUrl to:', incomingUrl);
      setYoutubeUrl(incomingUrl);
      setLoadedFromShareLink(true);

      if (freqParam) {
        const parsedFreq = freqParam === "default" ? "default" : parseInt(freqParam, 10);
        if (parsedFreq === "default" || !isNaN(parsedFreq)) {
          console.log('[page.tsx] useEffect (URL Params): Found freqParam, setting sharedFrequency to:', parsedFreq);
          setSharedFrequency(parsedFreq);
        } else {
          console.warn('[page.tsx] useEffect (URL Params): Invalid freqParam ignored:', freqParam);
        }
      }
    }
  }, [searchParams, loadedFromShareLink]);

  const handleLoadAudio = useCallback(async () => {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }
    console.log('[page.tsx] handleLoadAudio: Attempting to load audio. URL:', youtubeUrl);
    setIsLoading(true);
    setError(null);
    setAudioInfo(null);

    try {
      const requestBody = { url: youtubeUrl };
      console.log('[page.tsx] handleLoadAudio: Fetching /get_audio_info. Request body:', JSON.stringify(requestBody));
      
      const response = await fetch('http://localhost:8000/get_audio_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('[page.tsx] handleLoadAudio: Response received from /get_audio_info. Status:', response.status, 'Ok:', response.ok);

      if (!response.ok) {
        let errorDetail = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('[page.tsx] handleLoadAudio: Error data from /get_audio_info (response not ok):', errorData);
          errorDetail = errorData.detail || JSON.stringify(errorData);
        } catch (jsonError) {
          const rawErrorText = await response.text().catch(() => "Could not read raw error text for !response.ok.");
          console.error('[page.tsx] handleLoadAudio: Failed to parse error JSON for !response.ok. Raw response text:', rawErrorText, jsonError);
          errorDetail = rawErrorText || errorDetail;
        }
        throw new Error(errorDetail);
      }

      try {
        const data: AudioInfo = await response.json();
        console.log('[page.tsx] handleLoadAudio: Success! Audio info received from /get_audio_info (parsed JSON):', data);
        setAudioInfo(data);
      } catch (jsonParseError) {
        console.error('[page.tsx] handleLoadAudio: Failed to parse JSON from /get_audio_info (response was ok). Error:', jsonParseError);
        const rawText = await response.text().catch(() => "Could not retrieve raw text after JSON parse failure.");
        console.error('[page.tsx] handleLoadAudio: Raw response text for ok response that failed JSON parse:', rawText);
        setError(`Failed to process audio data: Malformed response. Raw text: ${rawText.substring(0, 100)}...`);
        setAudioInfo(null);
      }

    } catch (err: unknown) {
      console.error("[page.tsx] handleLoadAudio: Outer catch error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching audio info.");
      }
      setAudioInfo(null);
    } finally {
      setIsLoading(false);
      console.log("[page.tsx] handleLoadAudio: finally block. isLoading set to false.");
    }
  }, [youtubeUrl]);

  useEffect(() => {
    if (youtubeUrl && loadedFromShareLink && !audioInfo && !isLoading) {
      console.log('[page.tsx] useEffect (Auto-load): youtubeUrl set from share link, calling handleLoadAudio.');
      handleLoadAudio();
    }
  }, [youtubeUrl, loadedFromShareLink, audioInfo, isLoading, handleLoadAudio]);

  const handleUserUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    setLoadedFromShareLink(false);
    setAudioInfo(null);
    setError(null);
    setSharedFrequency(null);
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
            onChange={handleUserUrlChange}
            disabled={isLoading}
          />
          <Button 
            onClick={handleLoadAudio}
            className="bg-neutral-700 hover:bg-neutral-600/90 text-neutral-50 text-sm px-4 py-2 h-auto rounded-lg shadow-md active:bg-neutral-600 transition-all duration-150 ease-out border border-neutral-600/70 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load Audio"
            )}
          </Button>
        </div>
        {error && (
          <motion.div 
            className="mt-3 text-red-400 bg-red-900/30 p-3 rounded-lg text-sm text-center border border-red-700/50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      <motion.div 
        className="w-full max-w-3xl"
        {...sectionAnimationProps(0.1)}
      >
        <PlayerSection 
          key={audioInfo?.audio_stream_url}
          initialAudioUrl={audioInfo?.audio_stream_url}
          initialTitle={audioInfo?.title}
          initialDuration={audioInfo?.duration}
          initialThumbnailUrl={audioInfo?.thumbnail_url}
          originalYoutubeUrl={audioInfo ? youtubeUrl : undefined}
          sharedFrequency={sharedFrequency ?? undefined}
        />
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

      <motion.div
        className="w-full max-w-3xl mt-10 md:mt-14 text-center px-1 md:px-0"
        {...sectionAnimationProps(0.4)}
      >
        <h2 className="text-5xl font-bold uppercase mb-6 animated-concrete-text">
          F*CK YEAH, CONCRETE!
        </h2>
        <div className="bg-neutral-800/60 backdrop-blur-md border border-neutral-700/50 shadow-xl rounded-2xl p-3 md:p-4 inline-block relative" style={{ maxWidth: '600px' }}>
          <Image
            src="/images/dandelion_meme.png"
            alt="F*CK YEAH, CONCRETE meme - a dandelion thriving in concrete next to a wilting rose in soil"
            width={600} 
            height={400} 
            className="rounded-lg block"
          />
        </div>
      </motion.div>

      <footer className="text-center py-8 md:py-10 mt-8 md:mt-10 text-neutral-600 text-xs">
        © 2024 Lambro Radio. Tune into different vibrations.
      </footer>
    </main>
  );
};

export default function Home() {
  return (
    <Suspense fallback={<div>Loading page content...</div>}>
      <PageContent />
    </Suspense>
  );
}
