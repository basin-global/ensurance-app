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
    domains: [
      'cdn.simplehash.com',
      'openseauserdata.com',
      'i.seadn.io',
      'ipfs.io',
      'nft-cdn.alchemy.com',
      'metadata.ens.domains',
      'storage.googleapis.com',
      'arweave.net',
      'cloudflare-ipfs.com',
      '2rhcowhl4b5wwjk8.public.blob.vercel-storage.com'
    ]
  }
}

module.exports = nextConfig 