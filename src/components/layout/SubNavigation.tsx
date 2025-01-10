'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSite } from '@/contexts/site-context'

interface SubNavigationProps {
  type: 'accounts' | 'og' | 'assets' | 'certificates';
  groupName?: string;
}

export function SubNavigation({ type, groupName }: SubNavigationProps) {
  const pathname = usePathname()
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  // In development, we need the /site-onchain-agents prefix
  // In production, onchain-agents.ai serves directly from root
  const basePath = site === 'onchain-agents' && isDev ? '/site-onchain-agents' : ''
  
  let links;
  
  if (groupName) {
    links = [
      { href: `${basePath}/groups/${groupName}/all`, label: 'all' },
      { href: `${basePath}/groups/${groupName}/create`, label: 'create' },
      { href: `${basePath}/groups/${groupName}/mine`, label: 'mine' }
    ]
  } else if (type === 'certificates') {
    links = [
      { href: `${basePath}/certificates/all`, label: 'all' },
      { href: `${basePath}/certificates/create`, label: 'create' },
      { href: `${basePath}/certificates/mine`, label: 'mine' }
    ]
  } else {
    links = [
      { href: `${basePath}/all`, label: 'all' },
      { href: `${basePath}/create`, label: 'create' },
      { href: `${basePath}/mine`, label: 'mine' }
    ]
  }

  return (
    <nav className="relative z-20">
      <div className="container mx-auto px-4 flex justify-center">
        <ul className="flex space-x-8">
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <li key={href} className="block">
                <Link
                  href={href}
                  className={cn(
                    "block px-4 py-2 transition-colors",
                    isActive 
                      ? "font-bold text-white" 
                      : "font-normal text-gray-500 hover:text-gray-300"
                  )}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}