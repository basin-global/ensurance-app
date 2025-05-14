'use client'

import { HeaderSearch } from './HeaderSearch'
import { ConnectOperator } from './ConnectOperator'
import { HeaderLogo } from './HeaderLogo'
import { SubNavigation } from './SubNavigation'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  // Determine if and what type of sub-navigation to show
  const getSubNavConfig = () => {
    // For groups pages - extract group name from path
    if (pathname.startsWith('/groups/')) {
      const groupName = pathname.split('/')[2] // gets the group name from /groups/[group]/...
      return { show: true, type: 'og' as const, groupName }
    }

    // For certificates pages
    if (pathname.startsWith('/certificates/')) {
      return { show: true, type: 'certificates' as const }
    }

    // For account pages (including root level all/create/mine)
    if (pathname.startsWith('/(accounts)') || 
        pathname === '/all' || 
        pathname === '/create' || 
        pathname === '/mine') {
      return { show: true, type: 'accounts' as const }
    }

    // Default - no sub-navigation
    return { show: false, type: 'accounts' as const } // Provide default type even when not shown
  }

  const navConfig = getSubNavConfig()

  return (
    <header className="w-full border-b border-gray-800 relative z-10">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center">
          <HeaderLogo />
          <div className="flex-1 flex items-center justify-end">
            {/* Sub Navigation */}
            {navConfig.show && (
              <div className="mr-8">
                <SubNavigation 
                  type={navConfig.type}
                  groupName={navConfig.groupName}
                  compact={true}
                />
              </div>
            )}
            <div className="flex items-center">
              <HeaderSearch />
              <span className="text-sm font-mono opacity-50 mr-8">⌘K</span>
            </div>
            <ConnectOperator />
          </div>
        </nav>
      </div>
    </header>
  )
} 