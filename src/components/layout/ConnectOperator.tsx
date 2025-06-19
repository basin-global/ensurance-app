'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, User, Wallet } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'react-toastify'
import Link from 'next/link'

export function ConnectOperator() {
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

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.wallet?.address) return
    
    navigator.clipboard.writeText(user.wallet.address)
      .then(() => toast.success('Address copied to clipboard!', {
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }))
      .catch(() => toast.error('Failed to copy address'))
  }

  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"

  return (
    <div ref={menuRef} className="relative flex justify-end z-50">
      <div className="flex flex-col items-end">
        <button 
          onClick={handleClick}
          className="flex items-center text-base font-mono text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>{authenticated ? 'connected' : 'connect'}</span>
          <div className="inline-flex items-center ml-[10px]">
            <span className={cn(
              statusDotClasses,
              authenticated 
                ? "bg-green-500 after:bg-green-500/50" 
                : "bg-red-500 after:bg-red-500/50"
            )} />
          </div>
          {authenticated && <ChevronDown className="w-4 h-4 ml-1 opacity-60" />}
        </button>
        
        {showDropdown && (
          <div 
            className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 shadow-xl border border-gray-800 min-w-48"
          >
            <div className="flex flex-col space-y-1">
              {/* Portfolio Link */}
              <Link 
                href="/operator/portfolio"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-md transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Wallet className="w-4 h-4" />
                <span>portfolio</span>
              </Link>
              
              {/* Divider */}
              <div className="border-t border-gray-700 my-1" />
              
              {/* Address (clickable to copy) */}
              <div 
                onClick={handleCopyAddress}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer rounded-md transition-colors"
                title="Click to copy full address"
              >
                <User className="w-4 h-4" />
                <span className="font-mono">{truncateAddress(user?.wallet?.address)}</span>
              </div>
              
              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                className="flex items-center justify-end px-3 py-2 text-base font-mono text-gray-300 hover:text-gray-100 hover:bg-gray-800/50 rounded-md transition-colors w-full"
              >
                <span>disconnect</span>
                <div className="inline-flex items-center ml-[10px]">
                  <span className={cn(
                    statusDotClasses,
                    "bg-yellow-500 after:bg-yellow-500/50"
                  )} />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 