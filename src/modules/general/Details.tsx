'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useGeneralService } from './service/hooks'
import type { CoinDetails, TradingInfo } from './service/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

interface DetailsProps {
  contractAddress: string
  name: string
  tokenUri: string
}

export default function Details({ 
  contractAddress,
  name,
  tokenUri
}: DetailsProps) {
  const [metadata, setMetadata] = useState<any>(null)
  const [coinDetails, setCoinDetails] = useState<CoinDetails | null>(null)
  const [tradingInfo, setTradingInfo] = useState<TradingInfo | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [poolDetails, setPoolDetails] = useState<any>(null)
  const { getCoinDetails, getTradingInfo, getBuyConfig, getSellConfig, isAuthenticated } = useGeneralService()

  // Fetch real-time data
  useEffect(() => {
    const fetchData = async () => {
      const [details, trading] = await Promise.all([
        getCoinDetails(contractAddress),
        getTradingInfo(contractAddress)
      ])
      setCoinDetails(details)
      setTradingInfo(trading)

      // Fetch pool details from database
      try {
        const response = await fetch(`/api/pools/${contractAddress}`)
        if (response.ok) {
          const data = await response.json()
          setPoolDetails(data)
        }
      } catch (error) {
        console.error('Failed to fetch pool details:', error)
      }
    }
    fetchData()
  }, [contractAddress, getCoinDetails, getTradingInfo])

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
    if (!description) return null
    
    const maxLength = 150
    const shouldTruncate = description.length > maxLength
    
    if (!shouldTruncate) {
      return <p className="whitespace-pre-wrap">{description}</p>
    }

    const displayText = isDescriptionExpanded 
      ? description 
      : `${description.slice(0, maxLength)}...`

    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap">{displayText}</p>
        <button
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
        >
          {isDescriptionExpanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Media Display */}
      <Card className="bg-primary-dark border-gray-800">
        <CardContent className="p-4">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
            {videoUrl ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
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
        <h1 className="text-3xl font-bold">{name}</h1>
        
        {metadata?.description && (
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-base leading-relaxed text-gray-200">{renderDescription(metadata.description)}</p>
          </div>
        )}

        {coinDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm text-gray-500">Symbol</h3>
                <p className="text-lg">{coinDetails.symbol}</p>
              </div>
              {poolDetails && (
                <>
                  <div>
                    <h3 className="text-sm text-gray-500">Price</h3>
                    <p className="text-lg">$ {Number(poolDetails.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Market Cap</h3>
                    <p className="text-lg">$ {Number(poolDetails.marketCap).toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>

            {tradingInfo && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Trading</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="default" 
                    size="lg"
                    disabled={!isAuthenticated}
                  >
                    Buy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    disabled={!isAuthenticated}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          <h3 className="text-sm text-gray-500">Contract Address</h3>
          <p className="text-lg font-mono break-all">{contractAddress}</p>
        </div>
      </div>
    </div>
  )
} 