/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '2rhcowhl4b5wwjk8.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig 