'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EnsureButtons } from '@/components/layout/EnsureButtonsZora'
import { EnsureButtons0x } from '@/components/layout/EnsureButtons0x'
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
  total_supply: string
}

interface DetailsProps {
  contractAddress: `0x${string}`
  name?: string
  tokenUri?: string
  payout_recipient?: string
  provenance?: string
  initial_supply?: string
}

// Format number to human readable format (k, M)
const formatToHumanReadable = (num: number): string => {
  if (num === 0) return '0'
  if (num < 1000) return num.toString()
  
  if (num < 1000000) {
    // Format as k
    const value = num / 1000
    return value < 10 ? value.toFixed(1) + 'k' : Math.floor(value) + 'k'
  } else {
    // Format as M
    const value = num / 1000000
    return value < 10 ? value.toFixed(1) + 'M' : Math.floor(value) + 'M'
  }
}

// Convert string number with decimals to regular number
const parseTokenAmount = (amount: string): number => {
  try {
    // Handle scientific notation and convert to regular number
    const normalizedNum = Number(amount).toString()
    
    // If the number has a decimal point, remove 18 decimal places
    if (normalizedNum.includes('.')) {
      const [whole, decimal] = normalizedNum.split('.')
      const paddedDecimal = decimal.padEnd(18, '0')
      return Number(whole + paddedDecimal.slice(0, 18)) / Math.pow(10, 18)
    }
    
    // If it's a whole number, divide by 10^18
    return Number(amount) / Math.pow(10, 18)
  } catch (error) {
    console.error('Error parsing token amount:', error)
    return 0
  }
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
                <div className="grid grid-cols-4 gap-6">
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
                  <div>
                    <h3 className="text-sm text-gray-400 mb-1">burned</h3>
                    <p className="text-xl font-semibold">
                      {(() => {
                        const totalSupply = Number(certificateData.total_supply || '1000000000')
                        const burned = 1000000000 - totalSupply
                        console.log('Burn calculation:', {
                          totalSupply,
                          burned
                        })
                        return formatToHumanReadable(Math.max(0, burned))
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ensure Buttons */}
            <div className="flex flex-col items-center gap-6 pt-2">
              <div>
                <EnsureButtons 
                  contractAddress={contractAddress} 
                  imageUrl={convertIpfsUrl(metadata?.image) || FALLBACK_IMAGE}
                  showBurn={true}
                />
              </div>
              
              <div className="w-full flex flex-col items-center gap-4">
                <div className="w-full h-px bg-gray-800" />
                <div className="text-sm text-gray-400">or trade with</div>
                <EnsureButtons0x
                  contractAddress={contractAddress}
                  imageUrl={convertIpfsUrl(metadata?.image) || FALLBACK_IMAGE}
                  showBurn={true}
                />
              </div>
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