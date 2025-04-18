'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EnsureButtons } from '@/components/layout/EnsureButtons'
import { Proceeds } from '@/modules/proceeds/components/Proceeds'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

interface CertificateData {
  name: string
  symbol: string
  total_volume: string
  market_cap: string
  token_uri: string
  contract_address: string
  unique_holders: string
}

interface DetailsProps {
  contractAddress: `0x${string}`
  name?: string
  tokenUri?: string
  payout_recipient?: string
  provenance?: string
  initial_supply?: string
}

export default function Details({ 
  contractAddress,
  name,
  tokenUri,
  payout_recipient,
  provenance,
  initial_supply
}: DetailsProps) {
  const [metadata, setMetadata] = useState<any>(null)
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  // Fetch data from DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/general')
        if (!response.ok) throw new Error('Failed to fetch data')
        const data = await response.json()
        const certificate = data.find((cert: CertificateData) => cert.contract_address === contractAddress)
        if (certificate) {
          setCertificateData(certificate)
        }
      } catch (error) {
        console.error('Error fetching certificate data:', error)
      }
    }
    fetchData()
  }, [contractAddress])

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(convertIpfsUrl(tokenUri))
        if (response.ok) {
          const data = await response.json()
          setMetadata(data)
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      }
    }
    fetchMetadata()
  }, [tokenUri])

  const imageUrl = convertIpfsUrl(metadata?.image) || FALLBACK_IMAGE
  const videoUrl = metadata?.animation_url ? convertIpfsUrl(metadata.animation_url) : null

  const renderDescription = (description: string) => {
    if (!description) return null;
    
    const maxLength = 150;
    const shouldTruncate = description.length > maxLength;
    
    if (!shouldTruncate) {
      return <span className="whitespace-pre-wrap">{description}</span>;
    }

    const displayText = isDescriptionExpanded 
      ? description 
      : `${description.slice(0, maxLength)}...`;

    return (
      <div className="space-y-2">
        <span className="whitespace-pre-wrap">{displayText}</span>
        <button
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
        >
          {isDescriptionExpanded ? (
            <>
              show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              show more <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Media Display */}
      <Card className="bg-primary-dark border-0">
        <CardContent className="p-4">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={imageUrl}
                loop
                controls
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={imageUrl}
                alt={name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-cover"
                unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
                onError={(e: any) => {
                  e.target.src = FALLBACK_IMAGE
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold">{name}</h1>
        
        {/* Description */}
        {metadata?.description && (
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-base leading-relaxed text-gray-200">
              {renderDescription(metadata.description)}
            </div>
          </div>
        )}

        {certificateData && (
          <>
            {/* Metrics Card */}
            <Card className="bg-primary-dark/50 border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm text-gray-400 mb-1">market cap</h3>
                    <p className="text-xl font-semibold">${Number(certificateData.market_cap || '0').toLocaleString(undefined, { 
                      minimumFractionDigits: Number(certificateData.market_cap || '0') < 10 ? 2 : 0,
                      maximumFractionDigits: Number(certificateData.market_cap || '0') < 10 ? 2 : 0
                    })}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 mb-1">volume</h3>
                    <p className="text-xl font-semibold">${Number(certificateData.total_volume || '0').toLocaleString(undefined, { 
                      minimumFractionDigits: Number(certificateData.total_volume || '0') < 10 ? 2 : 0,
                      maximumFractionDigits: Number(certificateData.total_volume || '0') < 10 ? 2 : 0
                    })}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 mb-1">ensurers</h3>
                    <p className="text-xl font-semibold">{Number(certificateData.unique_holders || '0').toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ensure Buttons */}
            <div className="flex justify-center pt-2">
              <EnsureButtons 
                contractAddress={contractAddress} 
                imageUrl={convertIpfsUrl(metadata?.image) || FALLBACK_IMAGE}
              />
            </div>

            {/* Proceeds Section */}
            {(payout_recipient || provenance || initial_supply) && (
              <div className="pt-6">
                <Proceeds 
                  payout_recipient={payout_recipient}
                  provenance={provenance}
                  initial_supply={initial_supply}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 