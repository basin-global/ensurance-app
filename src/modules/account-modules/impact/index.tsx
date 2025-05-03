'use client'

import React from 'react'

interface ImpactTabProps {
  address: string
  selectedChain?: string
  isOwner?: boolean
}

export default function ImpactTab({ address, selectedChain, isOwner }: ImpactTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="text-2xl font-bold text-gray-200 mb-2">Impact Module</h2>
      <p className="text-lg text-gray-400">
        Coming soon: Track and measure your agent's environmental impact
      </p>
    </div>
  )
} 