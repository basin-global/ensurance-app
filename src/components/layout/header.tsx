'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSite } from '@/contexts/site-context'
import { HeaderSearch } from './HeaderSearch'
import { ConnectedAccount } from './ConnectedAccount'

export default function Header() {
  const pathname = usePathname()
  const site = useSite()
  
  const isOnchainAgentsRoute = site === 'onchain-agents'
  const isDev = process.env.NODE_ENV === 'development'
  
  const headerText = isOnchainAgentsRoute
    ? 'onchain agents'
    : 'ensurance agents'

  const homeUrl = isOnchainAgentsRoute
    ? (isDev ? '/site-onchain-agents' : '/')
    : '/'

  return (
    <header className="w-full border-b border-gray-800 relative z-10">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <Link 
            href={homeUrl}
            className="flex items-center gap-2.5 font-mono font-bold hover:opacity-80 transition-opacity text-base tracking-wide"
          >
            <Image 
              src={isOnchainAgentsRoute 
                ? "/onchain-agents/onchain-agents-orb.png"
                : "/groups/orbs/ensurance-orb.png"
              }
              alt="Logo"
              width={28}
              height={28}
            />
            {headerText}
          </Link>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors -ml-12">
              <HeaderSearch />
              <span className="text-sm font-mono opacity-50">⌘K</span>
            </div>
            <ConnectedAccount />
          </div>
        </nav>
      </div>
    </header>
  )
} 