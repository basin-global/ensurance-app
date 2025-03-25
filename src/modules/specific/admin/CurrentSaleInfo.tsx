'use client'

import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import { getToken } from '@zoralabs/protocol-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { ensuranceContracts } from '@/modules/certificates/specific/config/ensurance'
import { SaleConfig, FixedPriceSaleConfig, ERC20SaleConfig, TimedSaleConfig } from '../strategies/types'

interface CurrentSaleInfoProps {
  tokenId: string
  chain: string
  onSaleTypeChange?: (saleType: SaleConfig['saleType'] | null) => void
}

interface TokenMetadata {
  name?: string
  description?: string
  image?: string
}

interface TokenInfo {
  totalMinted?: bigint
  maxSupply?: bigint
  tokenURI?: string
  salesConfig?: SaleConfig
  primaryMintActive?: boolean
}

// Add helper function for date formatting
const formatDate = (timestamp: number | string | undefined) => {
  if (!timestamp || timestamp === '0' || Number(timestamp) === 0) return 'Not Set'
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString()
}

// Helper to resolve IPFS or HTTP URLs
const resolveUri = (uri: string) => {
  if (!uri) return ''
  return uri.startsWith('ipfs://') 
    ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') 
    : uri
}

// Add shared date display component
const DateInfo = ({ start, end }: { start?: number; end?: number }) => {
  const showDates = start !== 0 || end !== 0;
  
  if (!showDates) return null;
  
  return (
    <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-gray-700 pt-4 mt-2">
      <div>
        <p className="text-gray-400">Sale Start</p>
        <p className="font-mono">{formatDate(start)}</p>
      </div>
      <div>
        <p className="text-gray-400">Sale End</p>
        <p className="font-mono">{formatDate(end)}</p>
      </div>
    </div>
  );
}

// Strategy-specific info components
const FixedPriceInfo = ({ config }: { config: FixedPriceSaleConfig }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-gray-400">Price Per Token</p>
      <p className="font-mono">{formatEther(BigInt(config.pricePerToken))} ETH</p>
    </div>
    <div>
      <p className="text-gray-400">Max Per Address</p>
      <p className="font-mono">{config.maxTokensPerAddress || 'Unlimited'}</p>
    </div>
    <DateInfo start={config.saleStart} end={config.saleEnd} />
  </div>
)

const ERC20Info = ({ config }: { config: ERC20SaleConfig }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-gray-400">Price Per Token</p>
      <p className="font-mono">
        {(Number(config.pricePerToken) / Math.pow(10, 18)).toFixed(2)}
      </p>
    </div>
    <div>
      <p className="text-gray-400">Currency</p>
      <p className="font-mono break-all">{config.currency}</p>
    </div>
    <div>
      <p className="text-gray-400">Max Per Address</p>
      <p className="font-mono">{config.maxTokensPerAddress || 'Unlimited'}</p>
    </div>
    <DateInfo start={config.saleStart} end={config.saleEnd} />
  </div>
)

const TimedSaleInfo = ({ config }: { config: TimedSaleConfig }) => {
  const now = Math.floor(Date.now() / 1000);
  const marketStarted = now >= config.saleStart;
  const estimatedEnd = config.saleStart + config.marketCountdown;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-gray-400">Market Countdown</p>
        <p className="font-mono">{config.marketCountdown} seconds</p>
      </div>
      <div>
        <p className="text-gray-400">Minimum Market ETH</p>
        <p className="font-mono">{formatEther(BigInt(config.minimumMarketEth))} ETH</p>
      </div>
      <div>
        <p className="text-gray-400">Token Name</p>
        <p className="font-mono">{config.name}</p>
      </div>
      <div>
        <p className="text-gray-400">Token Symbol</p>
        <p className="font-mono">{config.symbol}</p>
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-gray-700 pt-4 mt-2">
        <div>
          <p className="text-gray-400">Sale Start</p>
          <p className="font-mono">{formatDate(config.saleStart)}</p>
        </div>
        <div>
          <p className="text-gray-400">Market Launch</p>
          <p className="font-mono">
            {!marketStarted 
              ? 'Market Not Started'
              : formatDate(estimatedEnd)
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export function CurrentSaleInfo({ 
  tokenId,
  chain,
  onSaleTypeChange
}: CurrentSaleInfoProps) {
  const [loading, setLoading] = useState(true)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetadata(uri: string) {
      try {
        const resolvedUri = resolveUri(uri)
        const response = await fetch(resolvedUri)
        const data = await response.json()
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

        const info: TokenInfo = {
          totalMinted: response.token?.totalMinted,
          maxSupply: response.token?.maxSupply,
          tokenURI: response.token?.tokenURI,
          salesConfig: response.token?.salesConfig as SaleConfig,
          primaryMintActive: response.primaryMintActive
        }

        setTokenInfo(info)
        
        if (onSaleTypeChange) {
          onSaleTypeChange(info.salesConfig?.saleType || null)
        }

        if (info.tokenURI) {
          await fetchMetadata(info.tokenURI)
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
    return <div className="animate-pulse">Loading sale configuration...</div>
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>
  }

  if (!tokenInfo) {
    return <div>No sale configuration found</div>
  }

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
            <div>
              <span className="text-gray-400">Total Minted:</span>{' '}
              <span className="font-mono">{tokenInfo.totalMinted?.toString() || '0'}</span>
            </div>
            <div>
              <span className="text-gray-400">Max Supply:</span>{' '}
              <span className="font-mono">{tokenInfo.maxSupply?.toString() || 'Unlimited'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Configuration */}
      {tokenInfo.salesConfig && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Sale Type:</span>{' '}
              <span className="font-mono">{tokenInfo.salesConfig.saleType}</span>
            </div>
            <div>
              <span className="text-gray-400">Active:</span>{' '}
              <span className="font-mono">{tokenInfo.primaryMintActive ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Strategy-specific info */}
          {tokenInfo.salesConfig.saleType === 'fixedPrice' && (
            <FixedPriceInfo config={tokenInfo.salesConfig} />
          )}
          {tokenInfo.salesConfig.saleType === 'erc20' && (
            <ERC20Info config={tokenInfo.salesConfig} />
          )}
          {tokenInfo.salesConfig.saleType === 'timed' && (
            <TimedSaleInfo config={tokenInfo.salesConfig} />
          )}
        </div>
      )}

      {/* Debug Info */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-400">Debug Info</summary>
        <pre className="mt-2 p-2 bg-black rounded overflow-auto">
          {JSON.stringify(tokenInfo, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value, 2
          )}
        </pre>
      </details>
    </div>
  )
} 