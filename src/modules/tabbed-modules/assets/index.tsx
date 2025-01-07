'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import AssetGrid from './AssetGrid'
import { Asset } from '@/types'
import { useSite } from '@/contexts/site-context'
import { getApiPrefix } from '@/lib/config/routes'
import { getActiveChains } from '@/config/chains'

interface AssetsTabProps {
  address: string
  selectedChain: string
  isOwner: boolean
}

export default function AssetsTab({ address, selectedChain, isOwner }: AssetsTabProps) {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const site = useSite()
  const apiPrefix = getApiPrefix(site)

  const fetchAssets = useCallback(async () => {
    if (!address) return

    setLoading(true)
    try {
      // Let the API handle active chains
      const response = await fetch(`${apiPrefix}/simplehash/nft?address=${address}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      setAssets(data.nfts || [])
    } catch (error) {
      console.error('Error fetching assets:', error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [address, apiPrefix])

  // Fetch assets only when address changes
  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Filter assets by selected chain in the UI
  const filteredAssets = useMemo(() => {
    if (selectedChain === 'all') return assets
    return assets.filter(asset => asset.chain === selectedChain)
  }, [assets, selectedChain])

  // Get counts by chain for debug
  const chainCounts = useMemo(() => {
    const counts: Record<string, number> = { all: assets.length }
    assets.forEach(asset => {
      counts[asset.chain] = (counts[asset.chain] || 0) + 1
    })
    return counts
  }, [assets])

  return (
    <div className="space-y-6">
      {/* Debug info */}
      <div className="text-sm text-gray-500">
        <p>TBA Address: {address}</p>
        <p>Selected Chain: {selectedChain}</p>
        <p>Total Assets: {chainCounts.all}</p>
        <p>Showing: {filteredAssets.length} assets</p>
        {Object.entries(chainCounts)
          .filter(([chain]) => chain !== 'all')
          .map(([chain, count]) => (
            <p key={chain}>Chain {chain}: {count} assets</p>
          ))}
      </div>

      {/* Grid */}
      <AssetGrid
        assets={filteredAssets}
        loading={loading}
      />
    </div>
  )
} 