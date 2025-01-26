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
      {/* Chat messages */}
      <div className="space-y-4">
        {/* Agent message */}
        <div className="flex justify-start">
          <div className="bg-gray-800 rounded-lg p-3 max-w-[80%] rounded-tl-none">
            <p className="text-gray-300">What do you want to ensure?</p>
          </div>
        </div>
        
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-blue-600 rounded-lg p-3 max-w-[80%] rounded-tr-none">
            <p className="text-white">I would like to ensure biodiversity and clean water for all.</p>
          </div>
        </div>
        
        {/* Agent message */}
        <div className="flex justify-start">
          <div className="bg-gray-800 rounded-lg p-3 max-w-[80%] rounded-tl-none">
            <p className="text-gray-300">Well we have several ways for you to do both!</p>
          </div>
        </div>
      </div>

      {/* Coming soon message */}
      <div className="text-center text-gray-400 text-sm mt-6">
        Full chat coming soon...
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