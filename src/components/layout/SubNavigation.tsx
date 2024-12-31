'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SubNavigationProps {
  type: 'accounts' | 'og' | 'assets' | 'ensurance';
  groupName?: string;
}

export function SubNavigation({ type, groupName }: SubNavigationProps) {
  const pathname = usePathname()
   
  const links = groupName 
    ? [
        { href: `/groups/${groupName}/all`, label: 'all' },
        { href: `/groups/${groupName}/create`, label: 'create' },
        { href: `/groups/${groupName}/mine`, label: 'mine' }
      ]
    : [
        { href: '/all', label: 'all' },
        { href: '/create', label: 'create' },
        { href: '/mine', label: 'mine' }
    ]

  return (
    <nav className="mb-8">
      <div className="container mx-auto px-4 flex justify-center">
        <ul className="flex space-x-8">
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "inline-block py-4 transition-colors",
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