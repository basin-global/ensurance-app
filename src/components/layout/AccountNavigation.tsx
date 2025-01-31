'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import * as Tooltip from '@radix-ui/react-tooltip'

interface AccountNavigationProps {
  accountName: string
}

export function AccountNavigation({ accountName }: AccountNavigationProps) {
  const pathname = usePathname()
  const isSubPage = pathname.endsWith('/hold') || pathname.endsWith('/tend') || pathname.endsWith('/presence')
  
  const links = [
    { 
      href: `/${accountName}/tend`, 
      label: 'TEND',
      tooltip: 'ensure this asset & outcome'
    },
    { 
      href: `/${accountName}/hold`, 
      label: 'HOLD',
      tooltip: 'view agent\'s portfolio'
    },
    { 
      href: `/${accountName}/presence`, 
      label: 'PRESENCE',
      tooltip: 'view agent\'s impact'
    }
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex items-center h-14 ml-[104px]">
        <div className="flex items-center">
          {/* Fixed width back arrow container */}
          <div className="w-10 flex justify-center">
            {isSubPage ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
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
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-900 px-3 py-1.5 rounded-md text-xs text-gray-200 border border-gray-800"
                    sideOffset={5}
                  >
                    Back to overview
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              <div className="w-10" /> 
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {links.map(({ href, label, tooltip }) => {
              const isActive = pathname === href
              return (
                <Tooltip.Root key={href}>
                  <Tooltip.Trigger asChild>
                    <Link
                      href={href}
                      className={cn(
                        "px-4 py-2 rounded-md text-base font-semibold tracking-wide transition-colors",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      {label}
                    </Link>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-gray-900 px-3 py-1.5 rounded-md text-xs text-gray-200 border border-gray-800"
                      sideOffset={5}
                    >
                      {tooltip}
                      <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )
            })}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  )
} 