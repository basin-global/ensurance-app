'use client'

import { HeaderSearch } from './HeaderSearch'
import { ConnectedAccount } from './ConnectedAccount'
import { HeaderLogo } from './HeaderLogo'

export default function Header() {
  return (
    <header className="w-full border-b border-gray-800 relative z-10">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <HeaderLogo />
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