/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // serverComponentsExternalPackages has been moved from experimental
  serverExternalPackages: ['sharp', 'yt-dlp'], // Moved from experimental

  // The 'api' block for bodyParser and responseLimit is no longer supported here.
  // These configurations, if needed, should be handled within API route handlers
  // or middleware for modern Next.js versions.

  // Add API rewrite rules
  async rewrites() {
    return [
      {
        source: '/api/get_audio_info',
        // In production, this should point to your deployed backend URL
        // Consider using an environment variable for the destination
        destination: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/get_audio_info',
      },
      {
        source: '/api/process_audio',
        // In production, this should point to your deployed backend URL
        // Consider using an environment variable for the destination
        destination: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/process_audio',
      },
    ];
  },
};

module.exports = nextConfig;
