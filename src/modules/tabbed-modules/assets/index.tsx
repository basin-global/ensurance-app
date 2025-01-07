'use client'

import React from 'react'
import AssetGrid from './AssetGrid'

interface AssetsTabProps {
  address: string
  selectedChain: string
  isOwner: boolean
}

export default function AssetsTab({ address, selectedChain, isOwner }: AssetsTabProps) {
  return (
    <div className="space-y-6">
      <AssetGrid
        address={address}
        selectedChain={selectedChain}
        isOwner={isOwner}
      />
    </div>
  )
} 