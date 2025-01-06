'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface ConnectedAccountProps {
  isConnected?: boolean
}

export function ConnectedAccount({ isConnected: defaultIsConnected = false }: ConnectedAccountProps) {
  const [isConnected, setIsConnected] = useState(defaultIsConnected)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = () => {
    setIsConnected(!isConnected)
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
  }

  return (
    <div className="relative">
      <button 
        onClick={handleClick}
        className="flex items-center gap-2 text-base font-mono text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span>{isConnected ? 'connected' : 'connect'}</span>
        {isConnected && (
          <ChevronDown className="w-4 h-4 translate-y-[1px] opacity-60" />
        )}
        <span className={cn(
          "w-2 h-2 rounded-full relative translate-y-[1px]",
          "after:content-[''] after:absolute after:inset-0",
          "after:rounded-full after:animate-pulse",
          isConnected 
            ? "bg-green-500 after:bg-green-500/50" 
            : "bg-red-500 after:bg-red-500/50"
        )} />
      </button>
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 rounded text-sm font-mono text-gray-300 whitespace-nowrap">
          coming soon
        </div>
      )}
    </div>
  )
} 