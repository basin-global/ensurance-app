'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SubNavigationProps {
  type: 'accounts' | 'og' | 'assets' | 'certificates';
  groupName?: string;
  compact?: boolean;
}

export function SubNavigation({ type, groupName, compact = false }: SubNavigationProps) {
  const pathname = usePathname()
  
  let links;
  
  if (groupName) {
    links = [
      { href: `/groups/${groupName}/all`, label: 'all' },
      { href: `/groups/${groupName}/create`, label: 'create' },
      { href: `/groups/${groupName}/mine`, label: 'mine' }
    ]
  } else if (type === 'certificates') {
    links = [
      { href: '/certificates/all', label: 'all' },
      { href: '/certificates/create', label: 'create' },
      { href: '/certificates/mine', label: 'mine' }
    ]
  } else {
    links = [
      { href: '/all', label: 'all' },
      { href: '/create', label: 'create' },
      { href: '/mine', label: 'mine' }
    ]
  }

  return (
    <nav className={cn("relative", compact ? "z-10" : "z-20")}>
      <div className={cn(
        "flex justify-center",
        compact ? "" : "container mx-auto px-4"
      )}>
        <ul className={cn(
          "flex",
          compact ? "space-x-4" : "space-x-8"
        )}>
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <li key={href} className="block">
                <Link
                  href={href}
                  className={cn(
                    "block transition-colors",
                    compact ? "px-2 py-1 text-sm" : "px-4 py-2",
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