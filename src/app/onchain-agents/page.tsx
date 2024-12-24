import ImageSwarm from '@/modules/shared/ImageSwarm'
import Link from 'next/link'

const agentImages = [
  {
    src: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/higher/generated/13.png',
    title: 'rise.higher',
    description: 'a higher network participant',
  },
  {
    src: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/basin/generated/109.png',
    title: 'beaver.basin',
    description: 'techo-naturalist ecosystem engineer',
  },
  {
    src: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/ai/generated/4.png',
    title: 'thomas.ai',
    description: 'always doing both',
  },
  {
    src: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/boulder/generated/29.png',
    title: 'otto.boulder',
    description: 'always doing both',
  },
  {
    src: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/tokyo/generated/6.png',
    title: '悠真.tokyo',
    description: '自然の安らぎと安全を東京につなぐためにAIを活用するユージェン',
  },
  // Add more agents as needed
]

export default function OnchainAgents() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 relative text-center">
        <h1 className="text-4xl font-bold mb-4">onchain .ai agents</h1>
        <Link 
          href="https://x.com/onchain_agents" 
          target="_blank"
          className="text-blue-400 hover:text-blue-300 transition-colors font-mono"
        >
          get early access
        </Link>
      </div>
      <ImageSwarm images={agentImages} />
    </main>
  )
}
