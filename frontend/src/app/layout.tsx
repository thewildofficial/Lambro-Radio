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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8">
          <header className="w-full max-w-4xl mb-8 flex justify-between items-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              Lambro Radio
            </h1>
          </header>
          <main className="flex-grow w-full max-w-4xl">
            {children}
          </main>
          <footer className="w-full max-w-4xl text-center py-4 text-sm text-gray-400">
            &copy; 2025 Lambro Radio
          </footer>
        </div>
      </body>
    </html>
  );
}
