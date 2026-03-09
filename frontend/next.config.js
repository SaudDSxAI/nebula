/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  async rewrites() {
    let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    if (!rawUrl.startsWith('http')) rawUrl = `https://${rawUrl}`;
    return [
      {
        source: '/api/:path*',
        destination: `${rawUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
