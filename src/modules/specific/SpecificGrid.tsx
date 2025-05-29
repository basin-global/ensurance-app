'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { formatUnits } from 'viem'
import { getContractTokens, type TokenDisplayInfo } from './collect'
import { CONTRACTS, MAX_SUPPLY_OPEN_EDITION } from './config'
import { Skeleton } from '@/components/ui/skeleton'
import { Grid, List } from 'lucide-react'
import SpecificList from './SpecificList'
import { cn } from '@/lib/utils'
import { toast } from 'react-toastify'

interface SpecificGridProps {
  searchQuery?: string
  onDataChange?: (data: any[]) => void
}

const FALLBACK_IMAGE = '/assets/no-image-found.png'

type ViewMode = 'grid' | 'list'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Status dot component
const StatusDot = ({ active }: { active: boolean }) => {
  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"
  
  return (
    <span className={cn(
      statusDotClasses,
      active 
        ? "bg-green-500 after:bg-green-500/50" 
        : "bg-red-500 after:bg-red-500/50"
    )} />
  )
}

export default function SpecificGrid({ 
  searchQuery = '',
  onDataChange
}: SpecificGridProps) {
  const [tokens, setTokens] = useState<TokenDisplayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, any>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  useEffect(() => {
    let mounted = true

    const fetchTokens = async () => {
      try {
        setLoading(true)
        const tokenList = await getContractTokens(CONTRACTS.specific)
        
        // Helper function to convert BigInts to strings for logging
        const convertBigIntsToStrings = (obj: any): any => {
          if (typeof obj === 'bigint') {
            return obj.toString()
          }
          if (Array.isArray(obj)) {
            return obj.map(convertBigIntsToStrings)
          }
          if (obj && typeof obj === 'object') {
            const newObj: any = {}
            for (const key in obj) {
              newObj[key] = convertBigIntsToStrings(obj[key])
            }
            return newObj
          }
          return obj
        }

        console.log('Raw Zora SDK Token Data:', JSON.stringify(convertBigIntsToStrings(tokenList), null, 2))
        console.log('Sample token structure:', convertBigIntsToStrings({
          tokenURI: tokenList[0]?.tokenURI,
          totalMinted: tokenList[0]?.totalMinted,
          maxSupply: tokenList[0]?.maxSupply,
          salesConfig: tokenList[0]?.salesConfig,
          primaryMintActive: tokenList[0]?.primaryMintActive
        }))
        
        if (mounted) {
          setTokens(tokenList)
          
          // Fetch metadata for each token
          const metadata: Record<string, any> = {}
          for (const token of tokenList) {
            try {
              if (token.tokenURI.startsWith('http')) {
                const response = await fetch(token.tokenURI)
                metadata[token.tokenURI] = await response.json()
              } else {
                metadata[token.tokenURI] = JSON.parse(token.tokenURI)
              }
            } catch (err) {
              console.error('Error fetching metadata for token:', err)
              metadata[token.tokenURI] = { error: true }
            }
          }
          if (mounted) {
            setTokenMetadata(metadata)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchTokens()

    return () => {
      mounted = false
    }
  }, [])

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens

    const searchLower = searchQuery.toLowerCase()
    return tokens.filter(token => {
      const metadata = tokenMetadata[token.tokenURI]
      if (!metadata || metadata.error) return false

      return (
        metadata.name?.toLowerCase().includes(searchLower) ||
        metadata.description?.toLowerCase().includes(searchLower)
      )
    })
  }, [tokens, tokenMetadata, searchQuery])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {[...Array(6)].map((_, index) => (
            <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
                <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (filteredTokens.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-medium">No Tokens Found</h2>
          <p className="text-yellow-600">No tokens found matching your search</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-end gap-2">
        <div className="bg-gray-900/30 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Grid view"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTokens.map((token) => {
            const metadata = tokenMetadata[token.tokenURI]
            const metadataError = metadata?.error
            let imageUrl = FALLBACK_IMAGE

            if (metadata && !metadataError && metadata.image) {
              imageUrl = metadata.image.startsWith('ipfs://') 
                ? metadata.image.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
                : metadata.image
            }

            return (
              <Card key={token.tokenURI} className="bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors">
                {token.primaryMintActive ? (
                  <Link href={`/specific/${CONTRACTS.specific}/${token.tokenURI.split('/').pop()}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                          <Image
                            src={imageUrl}
                            alt={metadata?.name || 'Token'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                            unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
                            onError={(e: any) => {
                              e.target.src = FALLBACK_IMAGE
                            }}
                          />
                        </div>
                        <div className="text-lg font-semibold text-white text-center">
                          {metadata && !metadataError ? metadata.name || 'Unnamed Token' : 'Unnamed Token'}
                        </div>
                        {metadataError && (
                          <div className="text-yellow-500 text-sm text-center">
                            Metadata not available
                          </div>
                        )}
                        {metadata && !metadataError && metadata.description && (
                          <div className="text-gray-400 text-sm text-center">{metadata.description}</div>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-400 px-2">
                          <div className="flex gap-4">
                            <div>issued: {token.totalMinted.toString()} / {token.maxSupply >= MAX_SUPPLY_OPEN_EDITION - BigInt(1) ? '∞' : token.maxSupply.toString()}</div>
                            {token.salesConfig?.pricePerToken && (
                              <div>${formatUnits(token.salesConfig.pricePerToken, 6)} ea</div>
                            )}
                          </div>
                          <StatusDot active={token.primaryMintActive || false} />
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                ) : (
                  <CardContent 
                    className="p-4 cursor-pointer" 
                    onClick={() => {
                      toast.error('This policy is no longer issuing certificates', {
                        position: "top-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                      })
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <Image
                          src={imageUrl}
                          alt={metadata?.name || 'Token'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                          unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
                          onError={(e: any) => {
                            e.target.src = FALLBACK_IMAGE
                          }}
                        />
                      </div>
                      <div className="text-lg font-semibold text-white text-center">
                        {metadata && !metadataError ? metadata.name || 'Unnamed Token' : 'Unnamed Token'}
                      </div>
                      {metadataError && (
                        <div className="text-yellow-500 text-sm text-center">
                          Metadata not available
                        </div>
                      )}
                      {metadata && !metadataError && metadata.description && (
                        <div className="text-gray-400 text-sm text-center">{metadata.description}</div>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-400 px-2">
                        <div className="flex gap-4">
                          <div>issued: {token.totalMinted.toString()} / {token.maxSupply >= MAX_SUPPLY_OPEN_EDITION - BigInt(1) ? '∞' : token.maxSupply.toString()}</div>
                          {token.salesConfig?.pricePerToken && (
                            <div>${formatUnits(token.salesConfig.pricePerToken, 6)} ea</div>
                          )}
                        </div>
                        <StatusDot active={token.primaryMintActive || false} />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <SpecificList 
          tokens={filteredTokens}
          tokenMetadata={tokenMetadata}
        />
      )}
    </div>
  )
} 