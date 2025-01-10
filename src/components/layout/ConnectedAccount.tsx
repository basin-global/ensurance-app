'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

export function ConnectedAccount() {
  const { login, ready, authenticated, logout, user } = usePrivy()
  const [showDropdown, setShowDropdown] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const truncateAddress = (address?: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!ready) return
    if (!authenticated) {
      login()
    } else {
      setShowDropdown(!showDropdown)
    }
  }

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation()
    logout()
    setShowDropdown(false)
  }

  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"

  return (
    <div ref={menuRef} className="relative flex justify-end">
      <div className="flex flex-col items-end">
        <button 
          onClick={handleClick}
          className="flex items-center text-base font-mono text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>{authenticated ? 'connected' : 'connect'}</span>
          {authenticated && <ChevronDown className="w-4 h-4 ml-1 opacity-60" />}
          <span className={cn(
            statusDotClasses,
            "ml-2",
            authenticated 
              ? "bg-green-500 after:bg-green-500/50" 
              : "bg-red-500 after:bg-red-500/50"
          )} />
        </button>
        
        {showDropdown && typeof window !== 'undefined' && createPortal(
          <div 
            className="absolute z-[1000001]"
            style={{
              top: (menuRef.current?.getBoundingClientRect().bottom || 0) + 8,
              right: window.innerWidth - (menuRef.current?.getBoundingClientRect().right || 0)
            }}
          >
            <div className="text-sm font-mono text-gray-400 text-right mb-2">
              {truncateAddress(user?.wallet?.address)}
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-end text-base font-mono text-gray-300 hover:text-gray-100 transition-colors cursor-pointer w-full"
            >
              disconnect
              <span className={cn(
                statusDotClasses,
                "ml-2",
                "bg-yellow-500 after:bg-yellow-500/50"
              )} />
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
} 