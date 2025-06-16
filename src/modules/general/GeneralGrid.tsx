'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from 'next/link'
import Image from 'next/image'
import { EnsureButtonsGeneral } from '@/components/layout/EnsureButtonsGeneral'
import { Grid, List, ArrowUpDown } from 'lucide-react'
import GeneralList from './GeneralList'
import { CONTRACTS } from '@/modules/specific/config'
import { cn } from '@/lib/utils'

interface CreatorEarning {
  amountUsd: string
  // Add other fields if needed
}

export interface GeneralCertificate {
  contract_address: string
  name: string
  token_uri: string
  image_url?: string
  video_url?: string
  total_volume?: string
  market_cap?: string
  creator_earnings?: CreatorEarning[]
  description?: string
  specific_asset_id?: number
  is_specific?: boolean
}

interface GeneralGridProps {
  searchQuery?: string
  urlPrefix?: string
  onDataChange?: (data: GeneralCertificate[]) => void
  isMiniApp?: boolean
  isOverview?: boolean
  hideMarketData?: boolean
  accountContext?: {
    name: string
    specific_asset_id?: number
  }
}

type ViewMode = 'grid' | 'list'
type SortField = 'name' | 'market_cap' | 'total_volume'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const SORT_CYCLES: SortField[] = ['name', 'market_cap', 'total_volume']

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Default certificates to always show in tend view
const DEFAULT_CERTIFICATES = [
  '0xd741057abca8fd4c0b99d2cd4c7a38c138ec4b47',
  '0xa538934778220c6f4ba55990892a8100b6817a31',
  '0x472957d852d4360f85fa1e43e0013729f1ade670',
  '0xb81929101e23af9a5e4c9f91f0dd0eedfad2baec',
  '0xe6a72264e567dcc38e30258d0c58f3dfb8a15b37',
  '0x6bc75fcb31207936643d939466ab9b97f6095aee',
  '0x530f3d8200953e2181fa4cae7317cdd78b0fdd73',
  '0x267b4b8e8b70522e0dd7ba3805d9068d5a4c5aa7'
]

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (!url) return undefined
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Format number with appropriate decimals
const formatNumber = (value: string | undefined) => {
  const num = Number(value || '0')
  return num.toLocaleString(undefined, {
    minimumFractionDigits: num < 10 ? 2 : 0,
    maximumFractionDigits: num < 10 ? 2 : 0
  })
}

// Helper function to normalize text for matching
const normalizeText = (text: string): string[] => {
  // Convert to lowercase and split by common separators
  const words = text.toLowerCase()
    .replace(/[_-]/g, ' ') // Replace hyphens and underscores with spaces
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 0) // Remove empty strings
  
  // Add the original text as a single term
  return [...new Set([...words, text.toLowerCase()])]
}

// Helper function to check if arrays have any common elements
const hasCommonElements = (arr1: string[], arr2: string[]): boolean => {
  return arr1.some(item => arr2.includes(item))
}

// Add this helper function near the top with other helpers
const isSpecificAsset = (cert: GeneralCertificate) => cert.is_specific

export default function GeneralGrid({ 
  searchQuery = '',
  urlPrefix = '',
  onDataChange,
  isMiniApp = false,
  isOverview = false,
  hideMarketData = false,
  accountContext
}: GeneralGridProps) {
  const [certificates, setCertificates] = useState<GeneralCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortConfig>({ field: 'total_volume', direction: 'desc' })
  const PRICE_UPDATE_INTERVAL = 60000 // 1 minute in milliseconds
  const [specificMetadata, setSpecificMetadata] = useState<Record<string, any>>({})

  // Fetch certificates
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/general')
        if (!response.ok) {
          throw new Error('Failed to fetch certificates')
        }
        const data = await response.json()
        
        // Filter out any certificates that failed to fetch market data
        const validCertificates = (data || []).filter((cert: GeneralCertificate) => cert && cert.contract_address)
        
        // Fetch metadata for each valid certificate
        const certificatesWithMetadata = await Promise.all(
          validCertificates.map(fetchMetadata)
        )
        
        setCertificates(certificatesWithMetadata)
        if (onDataChange) {
          onDataChange(certificatesWithMetadata)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch certificates')
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [onDataChange])

  // Fetch prices with caching
  useEffect(() => {
    const fetchPrices = async () => {
      const now = Date.now()
      if (now - lastPriceUpdate < PRICE_UPDATE_INTERVAL) {
        return // Skip if last update was less than 1 minute ago
      }

      try {
        // Fetch ETH price once since all tokens are ETH-based
        const response = await fetch('/api/eth-price')
        if (!response.ok) {
          console.warn('Failed to fetch ETH price')
          return
        }
        const data = await response.json()
        if (data.price) {
          // Store the same ETH price for all contract addresses
          const newPrices: Record<string, number> = {}
          certificates.forEach(cert => {
            if (cert.contract_address) {
              newPrices[cert.contract_address] = data.price
            }
          })
          setPrices(newPrices)
          setLastPriceUpdate(now)
        }
      } catch (err) {
        console.error('Error updating prices:', err)
      }
    }

    if (certificates.length > 0) {
      fetchPrices()
    }
  }, [certificates, lastPriceUpdate])

  // Fetch metadata from token URI
  const fetchMetadata = async (cert: GeneralCertificate) => {
    try {
      // Convert token_uri to use IPFS gateway if needed
      const fetchUrl = convertIpfsUrl(cert.token_uri)
      if (!fetchUrl) {
        return {
          ...cert,
          image_url: FALLBACK_IMAGE,
          video_url: null,
          description: ''
        }
      }
      const response = await fetch(fetchUrl)
      if (!response.ok) throw new Error('Failed to fetch metadata')
      const data = await response.json()
      
      // Get image and video URLs from metadata
      let imageUrl = data.image || data.content?.uri || FALLBACK_IMAGE
      let videoUrl = data.animation_url || null
      
      // Convert media URLs to use IPFS gateway
      imageUrl = convertIpfsUrl(imageUrl)
      if (videoUrl) {
        videoUrl = convertIpfsUrl(videoUrl)
      }
      
      return {
        ...cert,
        image_url: imageUrl,
        video_url: videoUrl,
        description: data.description || ''
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
      return {
        ...cert,
        image_url: FALLBACK_IMAGE,
        video_url: null,
        description: ''
      }
    }
  }

  // Add this useEffect to fetch metadata when specific_asset_id changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!accountContext?.specific_asset_id) return

      const tokenURI: string = `/api/metadata/${CONTRACTS.specific}/${accountContext.specific_asset_id}`
      try {
        const response = await fetch(tokenURI)
        const metadata = await response.json()
        setSpecificMetadata({ [tokenURI]: metadata })
      } catch (err) {
        console.error('Error fetching specific asset metadata:', err)
        setSpecificMetadata({})
      }
    }

    fetchMetadata()
  }, [accountContext?.specific_asset_id])

  const handleSortClick = () => {
    const fields = SORT_CYCLES
    const currentIndex = fields.indexOf(sort.field)
    
    // Move to next field, or back to first if at end
    const nextField = fields[(currentIndex + 1) % fields.length]
    
    // Set direction based on field type
    setSort({
      field: nextField,
      direction: nextField === 'name' ? 'asc' : 'desc'
    })
  }

  const getSortLabel = () => {
    const labels = {
      name: 'Sort by name (A-Z)',
      market_cap: 'Sort by market cap (High-Low)',
      total_volume: 'Sort by volume (High-Low)'
    }
    return labels[sort.field]
  }

  // Filter and sort certificates
  const filteredAndSortedCertificates = useMemo(() => {
    // First get matched certificates
    const matchedCertificates = certificates
      .filter(cert => {
        // First apply account context filter if present
        if (accountContext) {
          const accountTerms = normalizeText(accountContext.name)
          const certNameTerms = normalizeText(cert.name || '')
          const certDescTerms = normalizeText(cert.description || '')
          
          // Check for exact matches first
          if (certNameTerms.some(term => accountTerms.includes(term)) ||
              certDescTerms.some(term => accountTerms.includes(term))) {
            return true
          }
          
          // Check for partial matches in both name and description
          if (hasCommonElements(accountTerms, certNameTerms) ||
              hasCommonElements(accountTerms, certDescTerms)) {
            return true
          }
          
          // Check for reversed matches in both name and description
          const reversedAccountTerms = accountTerms.reverse()
          if (hasCommonElements(reversedAccountTerms, certNameTerms) ||
              hasCommonElements(reversedAccountTerms, certDescTerms)) {
            return true
          }
          
          return false
        }
        
        // Then apply regular search query filter
        const searchLower = (searchQuery || '').toLowerCase()
        return !searchQuery || 
          cert.name?.toLowerCase().includes(searchLower) ||
          cert.description?.toLowerCase().includes(searchLower)
      })

    // Add specific asset if it exists
    if (accountContext?.specific_asset_id) {
      const tokenURI = `/api/metadata/${CONTRACTS.specific}/${accountContext.specific_asset_id}`
      const metadata = specificMetadata[tokenURI]
      const specificAsset = {
        contract_address: CONTRACTS.specific,
        name: metadata?.name || `Specific Asset #${accountContext.specific_asset_id}`,
        token_uri: tokenURI,
        image_url: metadata?.image ? convertIpfsUrl(metadata.image) + `?t=${Date.now()}` : `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/specific-ensurance/${accountContext.specific_asset_id}.png?t=${Date.now()}`,
        is_specific: true,
        description: metadata?.description
      }
      matchedCertificates.unshift(specificAsset)
    }

    // Then get default certificates that aren't already in matched certificates
    const defaultCertificates = certificates
      .filter(cert => 
        DEFAULT_CERTIFICATES.includes(cert.contract_address.toLowerCase()) &&
        !matchedCertificates.some(matched => matched.contract_address === cert.contract_address)
      )

    // Sort matched certificates
    const sortedMatched = matchedCertificates.sort((a, b) => {
      // Always put specific assets first
      if (isSpecificAsset(a) && !isSpecificAsset(b)) return -1
      if (!isSpecificAsset(a) && isSpecificAsset(b)) return 1

      switch (sort.field) {
        case 'name':
          const aName = (a.name || '').toLowerCase()
          const bName = (b.name || '').toLowerCase()
          return sort.direction === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
        
        case 'market_cap':
        case 'total_volume':
          const aValue = Number(a[sort.field] || '0')
          const bValue = Number(b[sort.field] || '0')
          return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
        
        default:
          return 0
      }
    })

    // Sort default certificates
    const sortedDefaults = defaultCertificates.sort((a, b) => {
      switch (sort.field) {
        case 'name':
          const aName = (a.name || '').toLowerCase()
          const bName = (b.name || '').toLowerCase()
          return sort.direction === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
        
        case 'market_cap':
        case 'total_volume':
          const aValue = Number(a[sort.field] || '0')
          const bValue = Number(b[sort.field] || '0')
          return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
        
        default:
          return 0
      }
    })

    // Combine sorted lists with matched certificates first
    const allCertificates = [...sortedMatched, ...sortedDefaults]
    
    // If in overview mode, show 4 cards: 1 specific asset (if present) + 3 general certificates, or 4 general certificates if not
    if (isOverview) {
      if (accountContext?.specific_asset_id) {
        // Find the specific asset (should be first, but just in case)
        const specific = allCertificates.find(cert => cert.is_specific)
        // Filter out the specific asset from the rest
        const general = allCertificates.filter(cert => !cert.is_specific)
        // Overview: specific asset (if exists) + up to 3 general certificates
        return specific ? [specific, ...general.slice(0, 3)] : general.slice(0, 4)
      } else {
        return allCertificates.slice(0, 4)
      }
    }
    
    return allCertificates
  }, [certificates, searchQuery, sort, accountContext, isOverview, specificMetadata])

  if (loading) {
    return (
      <div className="space-y-4">
        {!isOverview && (
          <div className="flex items-center justify-end gap-2">
            <div className="bg-gray-900/30 rounded-lg p-1 flex gap-1">
              <button className="p-1.5 rounded-md bg-gray-800 text-white">
                <Grid className="w-5 h-5" />
              </button>
              <button className="p-1.5 rounded-md text-gray-400">
                <List className="w-5 h-5" />
              </button>
            </div>
            <button className="bg-gray-900/30 p-1.5 rounded-lg text-gray-400">
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {[...Array(isOverview ? 4 : 8)].map((_, index) => (
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

  return (
    <div className="space-y-4">
      {/* Controls Bar - Only show if not in overview mode */}
      {!isOverview && (
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

          <button
            onClick={handleSortClick}
            className="bg-gray-900/30 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
            title={getSortLabel()}
          >
            <ArrowUpDown 
              className={`w-5 h-5 transition-transform ${sort.direction === 'desc' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOverview ? 'md:grid-cols-2' : 'md:grid-cols-3 lg:grid-cols-4'} gap-6`}>
          {filteredAndSortedCertificates.map((cert) => (
            <Link 
              key={cert.contract_address}
              href={cert.is_specific 
                ? `/specific/${CONTRACTS.specific}/${cert.token_uri.split('/').pop()}`
                : `${urlPrefix}${isMiniApp ? '/mini-app' : ''}/general/${cert.contract_address}`
              }
            >
              <Card 
                className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  cert.is_specific && "relative after:content-[''] after:absolute after:inset-0 after:rounded-lg after:shadow-[0_0_15px_rgba(255,215,0,0.6),0_0_30px_rgba(255,215,0,0.3)] after:border-2 after:border-[rgba(255,215,0,0.8)]"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                      {cert.video_url ? (
                        <video
                          src={cert.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={cert.image_url || FALLBACK_IMAGE}
                          alt={cert.name || 'Certificate'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          priority={false}
                          loading="lazy"
                          className="object-cover"
                          unoptimized={cert.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = FALLBACK_IMAGE;
                          }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="text-lg font-semibold text-white text-center truncate">
                        {cert.name?.split('|')[0].trim() || 'Unnamed Certificate'}
                      </div>
                      {cert.name?.includes('|') && (
                        <div className="text-sm text-gray-400 text-center px-2">
                          {cert.name.split('|')[1].trim()}
                        </div>
                      )}
                    </div>
                    {!cert.is_specific && (
                      <div className={`flex items-center ${hideMarketData ? 'justify-center' : 'justify-between'} text-sm text-gray-400 px-2`}>
                        {!hideMarketData && (
                          <div className="flex gap-4">
                            <div>MC: ${Number(cert.market_cap || '0').toLocaleString(undefined, { 
                              minimumFractionDigits: Number(cert.market_cap || '0') < 10 ? 2 : 0,
                              maximumFractionDigits: Number(cert.market_cap || '0') < 10 ? 2 : 0
                            })}</div>
                            <div>Vol: ${Number(cert.total_volume || '0').toLocaleString(undefined, { 
                              minimumFractionDigits: Number(cert.total_volume || '0') < 10 ? 2 : 0,
                              maximumFractionDigits: Number(cert.total_volume || '0') < 10 ? 2 : 0
                            })}</div>
                          </div>
                        )}
                        <div onClick={(e) => e.preventDefault()}>
                          <EnsureButtonsGeneral 
                            contractAddress={cert.contract_address as `0x${string}`}
                            showMinus={false} 
                            showSend={false}
                            size="sm"
                            imageUrl={cert.image_url}
                            showBalance={false}
                            tokenName={cert.name}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <GeneralList 
          certificates={filteredAndSortedCertificates}
          urlPrefix={urlPrefix}
          isMiniApp={isMiniApp}
        />
      )}
    </div>
  )
} 