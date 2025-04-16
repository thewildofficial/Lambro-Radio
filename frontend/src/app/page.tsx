import Player from '@/components/Player';
import About from '@/components/About';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 p-4 space-y-12">
      <Player />
      <About />
    </main>
  );
}
