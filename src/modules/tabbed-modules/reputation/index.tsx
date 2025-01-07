'use client'

import React from 'react'

interface ReputationTabProps {
  address: string
  selectedChain: string
  isOwner: boolean
}

export default function ReputationTab({ address, selectedChain, isOwner }: ReputationTabProps) {
  return (
    <div className="flex flex-col items-left justify-left gap-4">
      <p className="text-2xl text-white-600 font-semibold self-start pl-4">
        Reputation Module Coming Soon
      </p>
      <img 
        src="/tab-placeholders/reputation.jpg" 
        alt="Reputation Module Coming Soon"
        className="w-full max-w-[1024px] h-auto rounded-lg shadow-lg"
      />
      
      {/* Debug info */}
      <div className="text-sm text-gray-500 pl-4">
        <p>Address: {address}</p>
        <p>Chain: {selectedChain}</p>
        <p>Is Owner: {isOwner.toString()}</p>
      </div>
    </div>
  )
} 