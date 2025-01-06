'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSite } from '@/contexts/site-context'

interface SubNavigationProps {
  type: 'accounts' | 'og' | 'assets' | 'ensurance';
  groupName?: string;
}

export function SubNavigation({ type, groupName }: SubNavigationProps) {
  const pathname = usePathname()
  const site = useSite()
  const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
  
  const links = groupName 
    ? [
        { href: `${basePath}/groups/${groupName}/all`, label: 'all' },
        { href: `${basePath}/groups/${groupName}/create`, label: 'create' },
        { href: `${basePath}/groups/${groupName}/mine`, label: 'mine' }
      ]
    : [
        { href: `${basePath}/all`, label: 'all' },
        { href: `${basePath}/create`, label: 'create' },
        { href: `${basePath}/mine`, label: 'mine' }
    ]

  return (
    <nav className="relative z-10">
      <div className="container mx-auto px-4 flex justify-center">
        <ul className="flex space-x-8">
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "inline-block py-2 transition-colors",
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