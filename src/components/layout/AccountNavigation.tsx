'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AccountNavigationProps {
  accountName: string
}

export function AccountNavigation({ accountName }: AccountNavigationProps) {
  const pathname = usePathname()
  const isSubPage = pathname.endsWith('/hold') || pathname.endsWith('/tend') || pathname.endsWith('/presence')
  
  const links = [
    { href: `/${accountName}/tend`, label: 'TEND' },
    { href: `/${accountName}/hold`, label: 'HOLD' },
    { href: `/${accountName}/presence`, label: 'PRESENCE' }
  ]

  return (
    <div className="flex items-center h-14">
      <div className="flex items-center">
        {/* Fixed width back arrow container */}
        <div className="w-10 flex justify-center">
          {isSubPage ? (
            <Link
              href={`/${accountName}`}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              title="Back to overview"
            >
              <svg 
                viewBox="0 0 16 16" 
                fill="none" 
                className="w-5 h-5"
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : (
            <div className="w-10" /> 
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium tracking-wide transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
} 