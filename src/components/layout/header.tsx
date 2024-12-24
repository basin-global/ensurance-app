'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  
  const isOnchainAgentsRoute = hostname.includes('onchain-agents.ai') || 
    pathname?.startsWith('/onchain-agents') || 
    pathname?.startsWith('/site-onchain-agents')
  
  const headerText = isOnchainAgentsRoute
    ? 'onchain agents'
    : 'ensurance agents'

  return (
    <header className="w-full border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono font-bold">
            {!isOnchainAgentsRoute && (
              <Image 
                src="/groups/orbs/ensurance-orb.png"
                alt="Logo"
                width={24}
                height={24}
              />
            )}
            {headerText}
          </div>
          <div className="flex items-center gap-4">
            {/* Add navigation items or buttons here later */}
          </div>
        </nav>
      </div>
    </header>
  )
} 