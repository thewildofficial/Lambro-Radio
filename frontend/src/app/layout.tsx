import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import KeepAlive from '@/components/KeepAlive';
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100`}>
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

        {/* The main content area */}
        <div className="min-h-screen flex flex-col items-center justify-start">
          <main className="flex-grow w-full relative z-10">
            {children}
          </main>
        </div>
        
        {/* Keep-alive component for backend connectivity */}
        <KeepAlive />
        
        {/* Umami Analytics Script */}
        {process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="lazyOnload"
            // Optional: To respect Do Not Track
            // data-do-not-track="true"
            // Optional: If your Umami instance is on a different domain than the site it's tracking AND it's self-hosted
            // data-host-url="https://your-actual-umami-domain.com" // Only if self-hosted script is served from a different domain than where Umami dashboard is.
          />
        )}
      </body>
    </html>
  );
}
