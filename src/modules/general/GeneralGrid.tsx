'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from 'next/link'
import Image from 'next/image'
import { EnsureButtons0x } from '@/components/layout/EnsureButtons0x'
import { Grid, List, ArrowUpDown } from 'lucide-react'
import GeneralList from './GeneralList'

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
}

interface GeneralGridProps {
  searchQuery?: string
  urlPrefix?: string
  onDataChange?: (data: GeneralCertificate[]) => void
  isMiniApp?: boolean
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

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
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

export default function GeneralGrid({ 
  searchQuery = '',
  urlPrefix = '',
  onDataChange,
  isMiniApp = false
}: GeneralGridProps) {
  const [certificates, setCertificates] = useState<GeneralCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortConfig>({ field: 'total_volume', direction: 'desc' })
  const PRICE_UPDATE_INTERVAL = 60000 // 1 minute in milliseconds

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
        video_url: videoUrl
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
      return {
        ...cert,
        image_url: FALLBACK_IMAGE,
        video_url: null
      }
    }
  }

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
    return certificates
      .filter(cert => {
        const searchLower = (searchQuery || '').toLowerCase()
        return !searchQuery || cert.name?.toLowerCase().includes(searchLower)
      })
      .sort((a, b) => {
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
  }, [certificates, searchQuery, sort])

  if (loading) {
    return (
      <div className="space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {[...Array(4)].map((_, index) => (
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
      {/* Controls Bar */}
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

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedCertificates.map((cert) => (
            <Card key={cert.contract_address} className="bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors">
              <Link href={`${urlPrefix}${isMiniApp ? '/mini-app' : ''}/general/${cert.contract_address}`}>
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
                    <div className="text-lg font-semibold text-white text-center">
                      {cert.name || 'Unnamed Certificate'}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400 px-2">
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
                      <div onClick={(e) => e.preventDefault()}>
                        <EnsureButtons0x 
                          contractAddress={cert.contract_address as `0x${string}`}
                          showMinus={false} 
                          size="sm"
                          imageUrl={cert.image_url}
                          showBalance={false}
                          tokenName={cert.name}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
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