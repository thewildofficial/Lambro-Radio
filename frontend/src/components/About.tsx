'use client';

import React from 'react';

const About: React.FC = () => (
  <section className="mt-12 px-6 py-10 bg-gray-800 rounded-2xl shadow-lg space-y-6 text-center">
    <h2 className="text-3xl font-bold text-indigo-400">About Lambro Radio</h2>
    <p className="text-gray-300 max-w-2xl mx-auto">
      Inspired by DejaRu22 (<a href="https://www.youtube.com/@LambrosRadio/videos" target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline">YouTube Channel</a>), Lambro Radio lets you transform any YouTube track into a 528 Hz experience, slow it down, and add lush reverb—all with one click.
    </p>
    <ul className="list-inside list-disc text-left max-w-md mx-auto text-gray-400 space-y-2">
      <li>Paste your favorite YouTube URL</li>
      <li>Hit the <span className="font-semibold">AI Magic ⚡</span> button</li>
      <li>Enjoy the retuned, slowed, and reverberated audio</li>
    </ul>
  </section>
);

export default About;
