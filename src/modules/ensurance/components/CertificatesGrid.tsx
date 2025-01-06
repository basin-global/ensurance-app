import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import AssetCard from '@/modules/assets/AssetCard'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Asset } from '@/types'
import { useSite } from '@/contexts/site-context'

interface CertificatesGridProps {
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  urlPrefix?: string
}

export default function CertificatesGrid({ 
  searchQuery = '',
  setSearchQuery = () => {},
  urlPrefix = ''
}: CertificatesGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  const getPathPrefix = () => {
    if (urlPrefix) return urlPrefix;
    if (isDev && site === 'onchain-agents') {
      return '/site-onchain-agents';
    }
    return '';
  };

  // Fetch all certificates
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/ensurance')
      setAssets(response.data || [])
    } catch (error) {
      console.error(`Error in fetchCertificates:`, error)
    } finally {
      setLoading(false)
    }
  }, [])

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
          address=""
          isEnsuranceTab={true}
          isTokenbound={false}
          isOwner={false}
          customUrl={`${getPathPrefix()}/certificates/${asset.chain}/${asset.token_id}`}
          hideCollection={true}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-lg text-gray-600 dark:text-gray-400">
        No certificates found{searchQuery ? ' matching your search' : ''}.
      </p>
    </div>
  )
} 