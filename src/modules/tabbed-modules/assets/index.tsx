'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import AssetGrid from './AssetGrid'
import { Asset } from '@/types'
import { useSite } from '@/contexts/site-context'
import { getBaseUrl } from '@/lib/config/routes'
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

  const fetchAssets = useCallback(async () => {
    if (!address) return

    setLoading(true)
    try {
      const baseUrl = getBaseUrl()
      const apiPath = site === 'onchain-agents' 
        ? process.env.NODE_ENV === 'development'
          ? '/site-onchain-agents/api'
          : '/api'
        : '/api'

      const url = `${baseUrl}${apiPath}/simplehash/nft?address=${address}${
        selectedChain !== 'all' ? `&chain=${selectedChain}` : ''
      }`

      console.log('[AssetsTab] Fetching assets:', { url, address, selectedChain, site })

      const response = await fetch(url)

      if (!response.ok) {
        console.error('[AssetsTab] API error:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      setAssets(data.nfts || [])
    } catch (error) {
      console.error('[AssetsTab] Error:', error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [address, selectedChain, site])

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
        address={address}
        isOwner={isOwner}
      />
    </div>
  )
} 