'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from 'next/link'
import Image from 'next/image'
import { EnsureButtons } from '@/components/layout/EnsureButtonsZora'

interface CreatorEarning {
  amountUsd: string
  // Add other fields if needed
}

interface GeneralCertificate {
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
  onDataChange = () => {},
  isMiniApp = false
}: GeneralGridProps) {
  const [certificates, setCertificates] = useState<GeneralCertificate[]>([])
  const [loading, setLoading] = useState(true)

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

  const fetchCertificates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/general')
      if (!response.ok) throw new Error('Failed to fetch certificates')
      const data = await response.json()
      
      // Filter out any certificates that failed to fetch market data
      const validCertificates = (data || []).filter(cert => cert && cert.contract_address)
      
      // Fetch metadata for each valid certificate
      const certificatesWithMetadata = await Promise.all(
        validCertificates.map(fetchMetadata)
      )
      
      setCertificates(certificatesWithMetadata)
      onDataChange(certificatesWithMetadata)
    } catch (error) {
      console.error('Error fetching certificates:', error)
      setCertificates([])
      onDataChange([])
    } finally {
      setLoading(false)
    }
  }, [onDataChange])

  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

  // Filter certificates based on search query
  const filteredCertificates = certificates.filter(cert => {
    const searchLower = (searchQuery || '').toLowerCase()
    return !searchQuery || cert.name?.toLowerCase().includes(searchLower)
  })
  .sort((a, b) => {
    // Convert volume strings to numbers, defaulting to 0 if undefined
    const volumeA = Number(a.total_volume || '0')
    const volumeB = Number(b.total_volume || '0')
    // Sort in descending order (highest volume first)
    return volumeB - volumeA
  })

  if (loading) {
    return (
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
    )
  }

  return filteredCertificates.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {filteredCertificates.map((cert) => (
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
                    <EnsureButtons 
                      contractAddress={cert.contract_address as `0x${string}`}
                      showMinus={false} 
                      size="sm"
                      imageUrl={cert.image_url}
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
    <div className="text-center py-8">
      <p className="text-lg text-gray-600 dark:text-gray-400">
        No certificates found{searchQuery ? ' matching your search' : ''}.
      </p>
    </div>
  )
} 