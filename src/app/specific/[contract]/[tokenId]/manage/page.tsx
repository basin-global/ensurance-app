'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'react-toastify'
import { isAppAdmin } from '@/config/admin'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTokenInfo, type TokenInfo } from '@/modules/specific/manage'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'

// Initialize public client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// Helper to convert IPFS URLs if needed
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Helper to format addresses
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Helper to format USDC price
const formatUsdcPrice = (price: string) => {
  if (!price) return '0.00'
  // Convert from 6 decimals to 2 decimals for display
  const priceInUsdc = Number(price) / 1_000_000
  return priceInUsdc.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Helper to format timestamp to date
const formatTimestamp = (timestamp: string) => {
  if (!timestamp || timestamp === '0') return 'Not set'
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

// Helper to format supply
const formatSupply = (totalMinted: string, maxSupply: string) => {
  // Check for effectively infinite supply (2^64 - 1 or 0)
  const isEffectivelyInfinite = maxSupply === '18446744073709551615' || maxSupply === '0'
  return `${totalMinted} / ${isEffectivelyInfinite ? '∞' : maxSupply}`
}

export default function ManagePage() {
  const params = useParams()
  const { user, ready, authenticated } = usePrivy()
  const address = user?.wallet?.address as `0x${string}` | undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('/assets/no-image-found.png')

  // Fetch token info on load
  useEffect(() => {
    if (!params.contract || !params.tokenId) return

    const fetchTokenInfo = async () => {
      try {
        const info = await getTokenInfo(
          params.contract as `0x${string}`,
          params.tokenId as string
        )
        setTokenInfo(info)

        // Fetch metadata to get image URL
        const metadataResponse = await fetch(`/api/metadata/${params.contract}/${params.tokenId}`)
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          if (metadata.image) {
            setImageUrl(convertIpfsUrl(metadata.image))
          }
        }
      } catch (error) {
        console.error('Error fetching token info:', error)
        toast.error('Failed to fetch token information')
      }
    }

    fetchTokenInfo()
  }, [params.contract, params.tokenId])

  // Redirect non-admins
  useEffect(() => {
    if (ready && authenticated && address && !isAppAdmin(address)) {
      router.push('/specific')
    }
  }, [ready, authenticated, address, router])

  // Show loading or unauthorized state
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader 
          title="manage specific certificate"
          showSearch={false}
          showBackArrow={true}
          backLink={`/specific/${params.contract}/${params.tokenId}`}
        />
        <div className="container mx-auto px-4 flex-1">
          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Please connect your wallet to continue.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (address && !isAppAdmin(address)) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader 
        title="manage specific certificate"
        showSearch={false}
        showBackArrow={true}
        backLink={`/specific/${params.contract}/${params.tokenId}`}
      />

      <div className="container mx-auto px-4 flex-1 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Token Preview Card */}
          <Card className="overflow-hidden bg-primary-dark/30 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-black/20">
                  <Image
                    src={imageUrl}
                    alt="Token thumbnail"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{tokenInfo?.name || `Token #${params.tokenId}`}</h2>
                    <p className="text-sm text-muted-foreground">
                      Contract: <span className="font-mono">{formatAddress(params.contract as string)}</span>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Creator</p>
                      <p className="font-mono text-sm" title={tokenInfo?.creator || ''}>
                        {tokenInfo?.creator ? formatAddress(tokenInfo.creator) : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Creation Date</p>
                      <p className="text-sm">
                        {tokenInfo?.creationDate ? new Date(tokenInfo.creationDate).toLocaleDateString() : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                      <p className="text-sm">${formatUsdcPrice(tokenInfo?.price || '0')} USDC</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Supply</p>
                      <p className="text-sm">
                        {formatSupply(tokenInfo?.totalMinted || '0', tokenInfo?.maxSupply || '0')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Start</p>
                      <p className="text-sm">{tokenInfo?.saleStart ? formatTimestamp(tokenInfo.saleStart) : 'Loading...'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale End</p>
                      <p className="text-sm">{tokenInfo?.saleEnd ? formatTimestamp(tokenInfo.saleEnd) : 'Loading...'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Funds Recipient</p>
                      <p className="font-mono text-sm" title={tokenInfo?.fundsRecipient || ''}>
                        {tokenInfo?.fundsRecipient ? formatAddress(tokenInfo.fundsRecipient) : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
