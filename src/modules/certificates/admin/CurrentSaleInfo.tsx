'use client'

import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import { getToken } from '@zoralabs/protocol-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { ensuranceContracts } from '@/modules/certificates/config/ensurance'

interface CurrentSaleInfoProps {
  tokenId: string
  chain: string
  onSaleTypeChange?: (saleType: "fixedPrice" | "erc20" | "allowlist" | "timed" | null) => void
}

interface TokenMetadata {
  name?: string
  description?: string
  image?: string
}

// Add helper function for date formatting
const formatDate = (timestamp: number | string | undefined) => {
  if (!timestamp) return 'Not Set'
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString()
}

export function CurrentSaleInfo({ 
  tokenId,
  chain,
  onSaleTypeChange
}: CurrentSaleInfoProps) {
  const [loading, setLoading] = useState(true)
  const [saleInfo, setSaleInfo] = useState<any>(null)
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper to resolve IPFS or HTTP URLs
  const resolveUri = (uri: string) => {
    if (!uri) return ''
    // Handle IPFS URIs
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
    }
    return uri
  }

  useEffect(() => {
    async function fetchMetadata(uri: string) {
      try {
        const resolvedUri = resolveUri(uri)
        console.log('Fetching metadata from:', resolvedUri)
        const response = await fetch(resolvedUri)
        const data = await response.json()
        console.log('Metadata response:', data)
        setMetadata(data)
      } catch (err) {
        console.error('Error fetching metadata:', err)
        setMetadata(null)
      }
    }

    async function fetchSaleInfo() {
      try {
        setLoading(true)
        setError(null)
        setMetadata(null)

        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })

        const contractAddress = ensuranceContracts[chain as keyof typeof ensuranceContracts]
        if (!contractAddress) {
          throw new Error('Invalid chain')
        }

        const response = await getToken({
          tokenContract: contractAddress as `0x${string}`,
          tokenId: BigInt(tokenId),
          chainId: base.id,
          publicClient,
          mintType: "1155"
        })

        console.log('Raw Zora SDK Response:', {
          salesConfig: (response.token as any)?.salesConfig,
          strategy: (response.token as any)?.saleStrategy,
          rawResponse: response
        })
        
        setSaleInfo(response)
        
        // Notify parent of sale type change
        if (onSaleTypeChange) {
          onSaleTypeChange((response.token as any)?.salesConfig?.saleType || null)
        }

        // Fetch metadata if URI is available
        if (response?.token?.tokenURI) {
          await fetchMetadata(response.token.tokenURI)
        }
      } catch (err) {
        console.error('Error fetching sale info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch sale info')
      } finally {
        setLoading(false)
      }
    }

    fetchSaleInfo()
  }, [tokenId, chain, onSaleTypeChange])

  if (loading) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg animate-pulse">
        <p>Loading sale configuration...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg">
        <p className="text-red-400">Error: {error}</p>
      </div>
    )
  }

  if (!saleInfo) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        <p>No sale configuration found</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-4">
      {/* Token Info */}
      <div className="flex items-center gap-4">
        {metadata?.image && (
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
            <img 
              src={resolveUri(metadata.image)} 
              alt={metadata?.name || 'Token thumbnail'} 
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {metadata?.name || `Token #${tokenId}`}
          </h3>
        </div>
      </div>

      <h3 className="text-lg font-semibold">Current Sale Configuration</h3>
      
      {/* Basic Token Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400">Total Minted</p>
          <p className="font-mono">{saleInfo.token?.totalMinted?.toString() || '0'}</p>
        </div>
        <div>
          <p className="text-gray-400">Max Supply</p>
          <p className="font-mono">{saleInfo.token?.maxSupply?.toString() || 'Unlimited'}</p>
        </div>
      </div>

      {/* Sale Status */}
      <div className="border-t border-gray-800 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400">Sale Type</p>
            <p className="font-mono">{saleInfo.token?.salesConfig?.saleType || 'Not Set'}</p>
          </div>
          <div>
            <p className="text-gray-400">Primary Sale Active</p>
            <p className="font-mono">{saleInfo.primaryMintActive ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-gray-400">Sale Start</p>
            <p className="font-mono">{formatDate(saleInfo.token?.salesConfig?.saleStart)}</p>
          </div>
          <div>
            <p className="text-gray-400">Sale End</p>
            <p className="font-mono">{formatDate(saleInfo.token?.salesConfig?.saleEnd)}</p>
          </div>
        </div>
      </div>

      {/* Price Info */}
      {saleInfo.token?.salesConfig && (
        <div className="border-t border-gray-800 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {saleInfo.token.salesConfig.pricePerToken && (
              <div>
                <p className="text-gray-400">Price Per Token</p>
                <p className="font-mono">
                  {saleInfo.token.salesConfig.currency ? (
                    `${(Number(saleInfo.token.salesConfig.pricePerToken) / Math.pow(10, 18)).toFixed(2)} ${saleInfo.token.salesConfig.currency}`
                  ) : (
                    `${formatEther(BigInt(saleInfo.token.salesConfig.pricePerToken))} ETH`
                  )}
                </p>
              </div>
            )}
            {saleInfo.token.salesConfig.currency && (
              <div>
                <p className="text-gray-400">Payment Token</p>
                <p className="font-mono break-all">{saleInfo.token.salesConfig.currency}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400">Debug Info</summary>
          <pre className="mt-2 p-2 bg-black rounded overflow-auto">
            {JSON.stringify(
              saleInfo,
              (key, value) => 
                typeof value === 'bigint' 
                  ? value.toString()
                  : value,
              2
            )}
          </pre>
        </details>
      </div>
    </div>
  )
} 