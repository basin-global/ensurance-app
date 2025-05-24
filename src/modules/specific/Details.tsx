'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { formatUnits } from 'viem'
import { EnsureButtons1155 } from '@/modules/specific/EnsureButtons1155'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

interface DetailsProps {
  contractAddress: `0x${string}`
  tokenId: string
  name?: string
  tokenUri?: string
}

export default function Details({ 
  contractAddress,
  tokenId,
  name = '',
  tokenUri
}: DetailsProps) {
  const [metadata, setMetadata] = useState<any>(null)
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/metadata/${contractAddress}/${tokenId}`)
        if (!response.ok) {
          throw new Error('Failed to load metadata')
        }
        const metadataResult = await response.json()
        setMetadata(metadataResult)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchMetadata()
  }, [contractAddress, tokenId])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-red-800 font-medium">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!metadata) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-yellow-800 font-medium">Not Found</h2>
        <p className="text-yellow-600">Token metadata not found</p>
      </div>
    )
  }

  const imageUrl = convertIpfsUrl(metadata.image || '') || FALLBACK_IMAGE

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Media Display */}
      <Card className="bg-primary-dark border-0">
        <CardContent className="p-4">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
            <Image
              src={imageUrl}
              alt={metadata.name || ''}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
              unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
              onError={(e: any) => {
                e.target.src = FALLBACK_IMAGE
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold">{metadata.name}</h1>
        
        {/* Description */}
        {metadata.description && (
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-base leading-relaxed text-gray-200">
              {metadata.description}
            </div>
          </div>
        )}

        {/* Token Info */}
        {tokenInfo && (
          <Card className="bg-primary-dark/50 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Token Info</h2>
              <div className="space-y-2">
                {/* Price */}
                {tokenInfo.salesConfig?.pricePerToken && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="font-medium">
                      {formatUnits(tokenInfo.salesConfig.pricePerToken, 6)} USDC
                    </span>
                  </div>
                )}

                {/* Supply */}
                {tokenInfo.token?.maxSupply && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Supply</span>
                    <span className="font-medium">
                      {tokenInfo.token.maxSupply.toString()}
                    </span>
                  </div>
                )}

                {/* Sale Status */}
                {tokenInfo.salesConfig && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sale Status</span>
                    <span className="font-medium">
                      {tokenInfo.salesConfig.saleEnd > BigInt(Math.floor(Date.now() / 1000))
                        ? 'Active'
                        : 'Ended'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ensure Buttons */}
        <div className="flex flex-col items-center gap-6 pt-2">
          <div className="w-full flex flex-col items-center gap-4">
            <EnsureButtons1155
              contractAddress={contractAddress}
              tokenId={tokenId}
              imageUrl={imageUrl}
              showBurn={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
