/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable streaming responses
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'yt-dlp'],
  },
  // Configure API routes
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  // Add API rewrite rules
  async rewrites() {
    return [
      {
        source: '/api/get_audio_info',
        destination: 'http://localhost:8000/get_audio_info',
      },
      {
        source: '/api/process_audio',
        destination: 'http://localhost:8000/process_audio',
      },
    ];
  },
};

module.exports = nextConfig;
