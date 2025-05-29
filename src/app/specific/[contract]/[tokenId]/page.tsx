'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { formatUnits } from 'viem'
import { getTokenInfo, type TokenDisplayInfo } from '@/modules/specific/collect'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export default function SpecificTokenPage({
  params
}: {
  params: { contract: string; tokenId: string }
}) {
  const [tokenInfo, setTokenInfo] = useState<TokenDisplayInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        setLoading(true)
        const info = await getTokenInfo(params.contract as `0x${string}`, params.tokenId)
        if (!info) {
          throw new Error('Failed to load token info')
        }
        setTokenInfo(info)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
  }, [params.contract, params.tokenId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!tokenInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-medium">Not Found</h2>
          <p className="text-yellow-600">Token not found</p>
        </div>
      </div>
    )
  }

  const imageUrl = convertIpfsUrl(tokenInfo.tokenURI) || FALLBACK_IMAGE

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Media Display */}
        <Card className="bg-primary-dark border-0">
          <CardContent className="p-4">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
              <Image
                src={imageUrl}
                alt="Token Image"
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
          <h1 className="text-3xl font-bold">Token #{params.tokenId}</h1>
          
          {/* Token Info */}
          <Card className="bg-primary-dark/50 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Token Info</h2>
              <div className="space-y-2">
                {/* Creator */}
                <div className="flex justify-between">
                  <span className="text-gray-400">Creator</span>
                  <span className="font-medium">
                    {tokenInfo.creator.slice(0, 6)}...{tokenInfo.creator.slice(-4)}
                  </span>
                </div>

                {/* Supply */}
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Minted</span>
                  <span className="font-medium">
                    {tokenInfo.totalMinted.toString()} / {tokenInfo.maxSupply.toString()}
                  </span>
                </div>

                {/* Price */}
                {tokenInfo.salesConfig?.pricePerToken && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="font-medium">
                      {formatUnits(tokenInfo.salesConfig.pricePerToken, 6)} USDC
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
        </div>
      </div>
    </div>
  )
}
