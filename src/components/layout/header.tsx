'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSite } from '@/contexts/site-context'

export default function Header() {
  const pathname = usePathname()
  const site = useSite()
  
  const isOnchainAgentsRoute = site === 'onchain-agents'
  
  const headerText = isOnchainAgentsRoute
    ? 'onchain agents'
    : 'ensurance agents'

  const homeUrl = isOnchainAgentsRoute
    ? '/site-onchain-agents'
    : '/'

  return (
    <header className="w-full border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link 
            href={homeUrl}
            className="flex items-center gap-2 font-mono font-bold hover:opacity-80 transition-opacity"
          >
            {!isOnchainAgentsRoute && (
              <Image 
                src="/groups/orbs/ensurance-orb.png"
                alt="Logo"
                width={24}
                height={24}
              />
            )}
            {headerText}
          </Link>
          <div className="flex items-center gap-4">
            {/* Add navigation items or buttons here later */}
          </div>
        </nav>
      </div>
    </header>
  )
} 