'use client'

import React from 'react'

interface ChatTabProps {
  address: string
  selectedChain?: string
  isOwner?: boolean
}

export default function ChatTab({ address }: ChatTabProps) {
  return (
    <div className="space-y-4">
      {/* Initial prompt */}
      <div className="text-gray-400 text-sm">
        What do you want to ensure?
      </div>

      {/* Example options */}
      <div className="grid grid-cols-2 gap-2">
        <button className="text-left px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          🌿 Nature & Biodiversity
        </button>
        <button className="text-left px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          🌊 Ocean & Marine Life
        </button>
        <button className="text-left px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          🌍 Climate Stability
        </button>
        <button className="text-left px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          🌱 Species & Habitat
        </button>
      </div>

      {/* Loading state */}
      <div className="flex items-center gap-1.5 mt-4">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  )
} 