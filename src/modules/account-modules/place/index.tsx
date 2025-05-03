'use client'

import React from 'react'

interface PlaceTabProps {
  address: string
  selectedChain?: string
  isOwner?: boolean
}

export default function PlaceTab({ address, selectedChain, isOwner }: PlaceTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="text-2xl font-bold text-gray-200 mb-2">Place Module</h2>
      <p className="text-lg text-gray-400">
        Coming soon: Geographic and spatial data for your agent
      </p>
    </div>
  )
} 