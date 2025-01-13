'use client'

import { HeaderSearch } from './HeaderSearch'
import { ConnectOperator } from './ConnectOperator'
import { HeaderLogo } from './HeaderLogo'

export default function Header() {
  return (
    <header className="w-full border-b border-gray-800 relative z-10">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center">
          <HeaderLogo />
          <div className="flex-1 flex items-center justify-end">
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