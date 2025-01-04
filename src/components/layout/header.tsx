'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSite } from '@/contexts/site-context'
import { HeaderSearch } from './HeaderSearch'

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
            <HeaderSearch />
          </div>
        </nav>
      </div>
    </header>
  )
} 