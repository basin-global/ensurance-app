'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { formatUnits } from 'viem'
import { getContractTokens, type TokenDisplayInfo } from './collect'
import { CONTRACTS, MAX_SUPPLY_OPEN_EDITION } from './config'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export default function SpecificGrid() {
  const [tokens, setTokens] = useState<TokenDisplayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, any>>({})

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
          salesConfig: tokenList[0]?.salesConfig
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
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

  if (tokens.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-medium">No Tokens Found</h2>
          <p className="text-yellow-600">No tokens found for this contract</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Tokens</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokens.map((token) => {
          const metadata = tokenMetadata[token.tokenURI]
          const metadataError = metadata?.error
          let imageUrl = FALLBACK_IMAGE

          if (metadata && !metadataError && metadata.image) {
            imageUrl = convertIpfsUrl(metadata.image)
          }

          return (
            <Card key={token.tokenURI} className="bg-primary-dark border-0">
              <CardContent className="p-4">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20 mb-4">
                  <Image
                    src={imageUrl}
                    alt="Token Image"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
                    onError={(e: any) => {
                      e.target.src = FALLBACK_IMAGE
                    }}
                  />
                </div>
                <div className="space-y-2">
                  {metadataError && (
                    <div className="text-yellow-500 text-sm mb-2">
                      Metadata not available
                    </div>
                  )}
                  {metadata && !metadataError && (
                    <>
                      <div className="font-medium text-lg mb-2">{metadata.name || 'Unnamed Token'}</div>
                      {metadata.description && (
                        <div className="text-gray-400 text-sm mb-2">{metadata.description}</div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Minted</span>
                    <span className="font-medium">
                      {token.totalMinted.toString()} / {token.maxSupply >= MAX_SUPPLY_OPEN_EDITION - BigInt(1) ? '∞' : token.maxSupply.toString()}
                    </span>
                  </div>
                  {token.salesConfig?.pricePerToken && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price</span>
                      <span className="font-medium">
                        {formatUnits(token.salesConfig.pricePerToken, 6)} USDC
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 