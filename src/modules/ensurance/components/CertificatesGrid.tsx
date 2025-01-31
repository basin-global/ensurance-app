'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import AssetCard from '@/modules/assets/AssetCard'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Asset } from '@/types'
import { ensuranceContracts } from '@/modules/ensurance/config'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

interface CertificatesGridProps {
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  urlPrefix?: string
  walletAddress?: string
  hideSearch?: boolean
  variant?: 'default' | 'home' | 'tend' | 'overview'
  maxItems?: number
}

export default function CertificatesGrid({ 
  searchQuery = '',
  setSearchQuery = () => {},
  urlPrefix = '',
  walletAddress,
  hideSearch = false,
  variant = 'default',
  maxItems = 16
}: CertificatesGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch certificates - either from SimpleHash for wallet or from DB for all
  const fetchCertificates = useCallback(async () => {
    if (error) return; // Prevent refetching if there's an error
    
    try {
      setLoading(true)
      setError(null)
      
      if (walletAddress) {
        // Format contract IDs from config
        const contractIds = Object.entries(ensuranceContracts).map(
          ([chain, address]) => `${chain}.${address.toLowerCase()}`
        )
        
        // Fetch NFTs from SimpleHash
        const nftResponse = await fetch(`/api/simplehash/nft?address=${walletAddress}&contract_ids=${contractIds.join(',')}`)
        if (!nftResponse.ok) {
          throw new Error('Failed to fetch NFTs')
        }
        const nftData = await nftResponse.json()
        setAssets(nftData.nfts || [])
      } else {
        // Use existing DB endpoint for all certificates
        const response = await fetch('/api/ensurance')
        if (!response.ok) {
          throw new Error('Failed to fetch certificates')
        }
        const data = await response.json()
        setAssets(data || [])
      }
    } catch (error) {
      console.error(`Error in fetchCertificates:`, error)
      setError('Failed to load certificates')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  // Initial fetch with cleanup
  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      try {
        await fetchCertificates()
      } catch (err) {
        // Error is already handled in fetchCertificates
      }
    }

    if (!error) { // Only load if there's no error
      load()
    }
    
    return () => {
      mounted = false
    }
  }, [fetchCertificates, error])

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    console.log('Filtering with keywords:', keywords);
    
    return assets.filter(asset => {
      // Only search in name and description of certificates
      const searchableFields = [
        asset.name?.toLowerCase() || '',
        asset.description?.toLowerCase() || ''
      ];
      
      // Match if any keyword matches any field
      return keywords.some(keyword => 
        searchableFields.some(field => field.includes(keyword))
      );
    });
  }, [assets, searchQuery])

  // Filter and limit assets based on variant
  const displayAssets = useMemo(() => {
    let result = filteredAssets;
    if (variant === 'home' || variant === 'overview') {
      result = result.slice(0, maxItems);
    }
    return result;
  }, [filteredAssets, variant, maxItems]);

  if (loading) {
    return (
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
        variant !== 'home' && "mt-6"
      )}>
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

  return variant === 'overview' ? (
    <div className="space-y-6">
      {displayAssets.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayAssets.slice(0, maxItems).map((asset) => (
              <AssetCard 
                key={asset.nft_id}
                asset={asset}
                address={walletAddress || ""}
                isEnsuranceTab={true}
                isTokenbound={false}
                isOwner={!!walletAddress}
                customUrl={`${urlPrefix}/certificates/${asset.chain}/${asset.token_id}`}
                hideCollection={true}
                hideChain={true}
                hideName={true}
              />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href={`${urlPrefix}/tend`}
              className={cn(
                buttonVariants({ 
                  variant: "outline", 
                  size: "lg" 
                }),
                "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              View All Certificates
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No certificates found{searchQuery ? ' matching your search' : ''}.
          </p>
        </div>
      )}
    </div>
  ) : variant === 'home' ? (
    <div className="relative pt-8 pb-24">
      <h2 className="text-3xl font-bold text-center mb-12">Latest Certificates</h2>
      <div className="max-w-[1200px] mx-auto px-[30px]">
        {displayAssets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayAssets.map((asset) => (
                <AssetCard 
                  key={asset.nft_id}
                  asset={asset} 
                  address={walletAddress || ""}
                  isEnsuranceTab={true}
                  isTokenbound={false}
                  isOwner={!!walletAddress}
                  customUrl={`${urlPrefix}/certificates/${asset.chain}/${asset.token_id}`}
                  hideCollection={true}
                  hideChain={true}
                />
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                href="/certificates"
                className={cn(
                  buttonVariants({ 
                    variant: "outline", 
                    size: "lg" 
                  }),
                  "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
              >
                View All Certificates
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              No certificates found
            </p>
          </div>
        )}
      </div>
    </div>
  ) : variant === 'tend' ? (
    <div className="space-y-6">
      {displayAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayAssets.map((asset) => (
            <AssetCard 
              key={asset.nft_id}
              asset={asset} 
              address={walletAddress || ""}
              isEnsuranceTab={true}
              isTokenbound={false}
              isOwner={!!walletAddress}
              customUrl={`${urlPrefix}/certificates/${asset.chain}/${asset.token_id}`}
              hideCollection={true}
              hideChain={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No certificates found{searchQuery ? ' matching your search' : ''}.
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-6">
      {displayAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayAssets.map((asset) => (
            <AssetCard 
              key={asset.nft_id}
              asset={asset} 
              address={walletAddress || ""}
              isEnsuranceTab={true}
              isTokenbound={false}
              isOwner={!!walletAddress}
              customUrl={`${urlPrefix}/certificates/${asset.chain}/${asset.token_id}`}
              hideCollection={true}
              hideChain={false}
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
      )}
    </div>
  )
} 