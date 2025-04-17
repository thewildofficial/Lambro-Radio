import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lambro Radio – Retune & Visualize Audio",
  description: "Elegant audio retuning and visualization by Lambro Radio",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Animated background gradients */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 blur-3xl animate-drift-slow"></div>
          <div className="absolute top-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-l from-indigo-900/20 to-purple-900/20 blur-3xl animate-drift-slow-reverse"></div>
          <div className="absolute -bottom-[40%] left-[10%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-blue-900/10 to-indigo-900/10 blur-3xl animate-drift-medium"></div>
          {/* Audio wave decorative element */}
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M0 40L48 50C96 60 192 80 288 80C384 80 480 60 576 50C672 40 768 40 864 50C960 60 1056 80 1152 90C1248 100 1344 100 1392 100L1440 100V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V40Z" fill="url(#paint0_linear)" />
              <defs>
                <linearGradient id="paint0_linear" x1="720" y1="40" x2="720" y2="120" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8">
          <header className="w-full max-w-5xl mb-8 flex justify-between items-center relative">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400">
              <span className="relative">
                Lambro Radio
                <span className="absolute -top-1 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-400/0 via-indigo-400/80 to-indigo-400/0"></span>
              </span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="pulse-dot"></div>
              <span className="text-xs text-gray-400 tracking-wider font-mono uppercase">Live</span>
            </div>
          </header>
          
          <main className="flex-grow w-full max-w-5xl relative z-10">
            {children}
          </main>
          
          <footer className="w-full max-w-5xl text-center py-6 text-sm text-gray-400 mt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>&copy; 2025 Lambro Radio</div>
              <div className="flex gap-4 text-xs">
                <a href="#" className="hover:text-indigo-300 transition-colors">Privacy</a>
                <a href="#" className="hover:text-indigo-300 transition-colors">Terms</a>
                <a href="#" className="hover:text-indigo-300 transition-colors">About</a>
                <a href="#" className="hover:text-indigo-300 transition-colors">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
