'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Asset } from '@/types'
import Link from 'next/link'
import AssetCard from '@/modules/assets/AssetCard'

interface AssetGridProps {
  address: string
  selectedChain: string
  isOwner: boolean
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  urlPrefix?: string
}

export default function AssetGrid({ 
  address,
  selectedChain,
  isOwner,
  searchQuery = '',
  setSearchQuery = () => {},
  urlPrefix = ''
}: AssetGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const getPathPrefix = () => {
    return urlPrefix || '';
  };

  const fetchAssets = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      // Remove or update any fetch calls to /api/simplehash
      // ... existing code ...
    } catch (error) {
      console.error('Error fetching assets:', error)
      setMessage("Failed to load assets")
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [address, selectedChain])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const searchLower = (searchQuery || '').toLowerCase()
      return !searchQuery || (
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.token_id?.toString().includes(searchLower) ||
        asset.chain?.toLowerCase().includes(searchLower)
      )
    })
  }, [assets, searchQuery])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {[...Array(4)].map((_, index) => (
          <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
              <Skeleton className="h-4 w-1/2 bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (message) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{message}</p>
      </div>
    )
  }

  return filteredAssets.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 grid-auto-rows-[minmax(min-content,max-content)]">
      {filteredAssets.map((asset) => (
        <AssetCard 
          key={asset.nft_id}
          asset={asset} 
          address={address}
          isTokenbound={true}
          isOwner={isOwner}
          customUrl={`${getPathPrefix()}/assets/${asset.chain}/${asset.contract_address}/${asset.token_id}`}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-lg text-gray-600 dark:text-gray-400">
        No assets found{searchQuery ? ' matching your search' : ''}.
        {!searchQuery && (
          <>
            {' '}You can create one{' '}
            <Link 
              href={`${getPathPrefix()}/assets/create`}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              here
            </Link>.
          </>
        )}
      </p>
    </div>
  )
} 