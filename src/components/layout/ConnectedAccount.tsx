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

  return (
    <div className="relative connected-account">
      <button 
        onClick={handleClick}
        className="flex items-center gap-2 text-base font-mono text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span>{authenticated ? 'connected' : 'connect'}</span>
        {authenticated && (
          <ChevronDown className="w-4 h-4 translate-y-[1px] opacity-60" />
        )}
        <span className={cn(
          "w-2 h-2 rounded-full relative translate-y-[1px]",
          "after:content-[''] after:absolute after:inset-0",
          "after:rounded-full after:animate-pulse",
          authenticated 
            ? "bg-green-500 after:bg-green-500/50" 
            : "bg-red-500 after:bg-red-500/50"
        )} />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 py-1 bg-gray-800 rounded-md shadow-lg border border-gray-700">
          <div className="px-4 py-2 text-sm font-mono text-gray-400 border-b border-gray-700">
            {truncateAddress(user?.wallet?.address)}
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 text-left text-base font-mono text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <span>disconnect</span>
            <span className={cn(
              "w-2 h-2 rounded-full relative translate-y-[1px]",
              "bg-yellow-500"
            )} />
          </button>
        </div>
      )}
    </div>
  )
} 