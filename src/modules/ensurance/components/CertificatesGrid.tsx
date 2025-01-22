import React, { useEffect, useState, useCallback, useMemo } from 'react'
import AssetCard from '@/modules/assets/AssetCard'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Asset } from '@/types'
import { ensuranceContracts } from '@/modules/ensurance/config'
import Link from 'next/link'

interface CertificatesGridProps {
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  urlPrefix?: string
  walletAddress?: string
}

export default function CertificatesGrid({ 
  searchQuery = '',
  setSearchQuery = () => {},
  urlPrefix = '',
  walletAddress
}: CertificatesGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  
  // Fetch certificates - either from SimpleHash for wallet or from DB for all
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true)
      
      if (walletAddress) {
        // Format contract IDs from config
        const contractIds = Object.entries(ensuranceContracts).map(
          ([chain, address]) => `${chain}.${address.toLowerCase()}`
        )
        
        console.log('Using contract IDs:', contractIds)
        
        // Fetch NFTs from SimpleHash
        const nftResponse = await fetch(`/api/simplehash/nft?address=${walletAddress}&contract_ids=${contractIds.join(',')}`)
        if (!nftResponse.ok) throw new Error('Failed to fetch NFTs')
        const nftData = await nftResponse.json()
        setAssets(nftData.nfts || [])
      } else {
        // Use existing DB endpoint for all certificates
        const response = await fetch('/api/ensurance')
        if (!response.ok) throw new Error('Failed to fetch certificates')
        const data = await response.json()
        setAssets(data || [])
      }
    } catch (error) {
      console.error(`Error in fetchCertificates:`, error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  // Initial fetch
  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

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

  return filteredAssets.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 grid-auto-rows-[minmax(min-content,max-content)]">
      {filteredAssets.map((asset) => (
        <AssetCard 
          key={asset.nft_id}
          asset={asset} 
          address={walletAddress || ""}
          isEnsuranceTab={true}
          isTokenbound={false}
          isOwner={!!walletAddress}
          customUrl={`${urlPrefix}/certificates/${asset.chain}/${asset.token_id}`}
          hideCollection={true}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-lg text-gray-600 dark:text-gray-400">
        No certificates found{searchQuery ? ' matching your search' : ''}.
        {!searchQuery && (
          <>
            {' '}You can create one{' '}
            <Link 
              href={`${urlPrefix}/certificates/create`}
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