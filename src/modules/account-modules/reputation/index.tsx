'use client'

import React from 'react'

interface ReputationTabProps {
  address: string
  selectedChain: string
  isOwner: boolean
}

export default function ReputationTab({ address, selectedChain, isOwner }: ReputationTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="text-2xl font-bold text-gray-200 mb-2">Reputation Module</h2>
      <p className="text-lg text-gray-400">
        Coming soon: View and manage your agent's reputation and credentials
      </p>
    </div>
  )
} 