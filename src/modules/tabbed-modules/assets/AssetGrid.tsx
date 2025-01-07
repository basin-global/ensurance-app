'use client'

import React, { useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Asset } from '@/types'
import { useSite } from '@/contexts/site-context'
import AssetCard from '@/modules/assets/AssetCard'

interface AssetGridProps {
  assets: Asset[]
  loading?: boolean
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  urlPrefix?: string
  address: string
  isOwner: boolean
}

export default function AssetGrid({ 
  assets = [],
  loading = false,
  searchQuery = '',
  setSearchQuery = () => {},
  urlPrefix = '',
  address,
  isOwner
}: AssetGridProps) {
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  const getPathPrefix = () => {
    if (urlPrefix) return urlPrefix;
    if (isDev && site === 'onchain-agents') {
      return '/site-onchain-agents';
    }
    return '';
  };

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const searchLower = (searchQuery || '').toLowerCase()
      return !searchQuery || (
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.token_id?.toString().includes(searchLower) ||
        asset.chain?.toLowerCase().includes(searchLower)  // Allow searching by chain name too
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
      </p>
    </div>
  )
} 