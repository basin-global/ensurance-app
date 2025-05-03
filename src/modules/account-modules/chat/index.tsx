'use client'

import React from 'react'

interface ChatTabProps {
  address: string
  selectedChain?: string
  isOwner?: boolean
  isAgent?: boolean
}

export default function ChatTab({ address, isAgent = false }: ChatTabProps) {
  return (
    <div className="relative min-h-[300px]">
      <div className={`space-y-4 ${!isAgent ? 'blur-[2px]' : ''}`}>
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

      {/* Overlay when not agentified */}
      {!isAgent && (
        <div className="absolute inset-0 flex flex-col items-center bg-black/10 backdrop-blur-[1px] rounded-lg">
          <div className="bg-black/30 px-8 py-4 rounded-xl text-center mt-[225px]">
            <p className="text-lg text-white mb-4">This account has not been agentified yet!</p>
            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              MAKE AGENT
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 