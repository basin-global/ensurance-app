'use client'

import React from 'react'

interface ChatTabProps {
  address: string
  selectedChain?: string
  isOwner?: boolean
}

export default function ChatTab({ address }: ChatTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Initial prompt */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <p className="text-gray-300">What do you want to ensure?</p>
      </div>

      {/* Example options */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 hover:text-gray-300 transition-colors text-left">
          🌿 Nature & Biodiversity
        </button>
        <button className="bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 hover:text-gray-300 transition-colors text-left">
          🌊 Ocean & Marine Life
        </button>
        <button className="bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 hover:text-gray-300 transition-colors text-left">
          🌍 Climate Action
        </button>
        <button className="bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 hover:text-gray-300 transition-colors text-left">
          🌱 Sustainable Agriculture
        </button>
      </div>

      {/* Loading state */}
      <div className="flex items-center gap-2 text-gray-500 mt-4">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  )
} 