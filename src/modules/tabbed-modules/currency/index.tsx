'use client'

import React from 'react'

interface CurrencyTabProps {
  address: string
  selectedChain: string
  isOwner: boolean
}

export default function CurrencyTab({ address, selectedChain, isOwner }: CurrencyTabProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Currency</h2>
      <p className="text-gray-400">Chain: {selectedChain}</p>
    </div>
  )
} 