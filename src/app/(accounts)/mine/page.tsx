'use client'

import Image from 'next/image'
import { useSite } from '@/contexts/site-context'
import { SubNavigation } from '@/components/layout/SubNavigation'

export default function MyAccountsPage() {
  const site = useSite()
  const isOnchainAgents = site === 'onchain-agents'
  const orbImage = isOnchainAgents ? '/groups/orbs/ai-orb.png' : '/groups/orbs/ensurance-orb.png'

  return (
    <>
      <SubNavigation type="accounts" />
      <div className="flex items-center justify-center py-24">
        <div className="w-20 h-20 flex-shrink-0 mr-6">
          <Image
            src={orbImage}
            alt={isOnchainAgents ? 'AI orb' : 'Ensurance orb'}
            width={80}
            height={80}
            className="rounded-full"
          />
        </div>
        <div>
          <p className="text-xl font-mono text-white-400 mb-4">
            {isOnchainAgents ? 'View and manage your onchain agents...' : 'View and manage your accounts...'}
          </p>
          <p className="text-gray-500 font-mono">
            {isOnchainAgents ? 'Agent' : 'Account'} management is coming soon.{' '}
            <a 
              href="https://x.com/onchain_agents" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              follow updates here
            </a>
            .
          </p>
        </div>
      </div>
    </>
  )
} 