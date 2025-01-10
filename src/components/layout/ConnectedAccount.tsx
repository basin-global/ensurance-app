'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

interface ConnectedAccountProps {
  isConnected?: boolean
}

export function ConnectedAccount() {
  const { login, ready, authenticated, logout, user } = usePrivy()
  const [showDropdown, setShowDropdown] = useState(false)

  const truncateAddress = (address?: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.connected-account')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleClick = async () => {
    if (!ready) return
    
    if (!authenticated) {
      await login()
    } else {
      setShowDropdown(!showDropdown)
    }
  }

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(false)
    await logout()
  }

  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"

  return (
    <div className="relative connected-account flex justify-end">
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
        
        {showDropdown && (
          <div className="absolute top-full mt-2 z-50">
            <div className="text-sm font-mono text-gray-400 text-right mb-2">
              {truncateAddress(user?.wallet?.address)}
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center text-base font-mono text-gray-300 hover:text-gray-100 transition-colors"
            >
              <span>disconnect</span>
              <span className={cn(
                statusDotClasses,
                "ml-2",
                "bg-yellow-500 after:bg-yellow-500/50"
              )} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 