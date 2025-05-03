import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable MDX
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  
  // Configure image domains and patterns
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
      '2rhcowhl4b5wwjk8.public.blob.vercel-storage.com',
      'magic.decentralized-content.com',
      'raw.githubusercontent.com'
    ]
  }
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig) 