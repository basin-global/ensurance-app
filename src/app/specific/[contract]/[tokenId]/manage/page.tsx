'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createPublicClient, http, createWalletClient, custom } from 'viem'
import { base } from 'viem/chains'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { toast } from 'react-toastify'
import { isAppAdmin } from '@/config/admin'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTokenInfo } from '@/modules/specific/manage'
import { CONTRACTS, ABIS, SUPPORTED_TOKENS, type SupportedERC20Token, formatUsdcAmount, parseUsdcAmount, validateUsdcAmount, formatTimestamp, formatDateForInput, dateToUint64, formatSalesConfigForContract, formatSaleEnd } from '@/modules/specific/config'
import { encodeSalesConfig } from '@/modules/specific/callSale'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TokenData, SalesConfig } from '@/modules/specific/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

// Helper to format supply
const formatSupply = (totalMinted: string, maxSupply: string) => {
  // Check for effectively infinite supply (2^64 - 1, 2^64, or 0)
  const isEffectivelyInfinite = 
    maxSupply === '18446744073709551615' || 
    maxSupply === '18446744073709551616' || 
    maxSupply === '0'
  return `${totalMinted} / ${isEffectivelyInfinite ? '∞' : maxSupply}`
}

// Helper to validate address
const isValidAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Helper to format date for display
const formatDateForDisplay = (timestamp: string | undefined) => {
  if (!timestamp || timestamp === '0') return ''
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ManagePage() {
  const params = useParams()
  const { user, ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const activeWallet = wallets[0]
  const address = user?.wallet?.address as `0x${string}` | undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{ token: TokenData; salesConfig: SalesConfig } | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('/assets/no-image-found.png')
  const [fundsRecipient, setFundsRecipient] = useState('')
  const [price, setPrice] = useState('')
  const [saleStart, setSaleStart] = useState('')
  const [saleEnd, setSaleEnd] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [description, setDescription] = useState<string>('')
  const [selectedCurrency, setSelectedCurrency] = useState<`0x${string}`>(CONTRACTS.usdc)

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

        // Set form values from current token info
        if (info.salesConfig.fundsRecipient) setFundsRecipient(info.salesConfig.fundsRecipient)
        if (info.salesConfig.pricePerToken) setPrice(formatUsdcAmount(info.salesConfig.pricePerToken.toString()))
        if (info.salesConfig.saleStart) setSaleStart(formatDateForInput(info.salesConfig.saleStart.toString()))
        if (info.salesConfig.saleEnd && info.salesConfig.saleEnd !== BigInt(0)) setSaleEnd(formatDateForInput(info.salesConfig.saleEnd.toString()))
        if (info.salesConfig.currency) setSelectedCurrency(info.salesConfig.currency)

        // Fetch metadata to get image URL and description
        const metadataResponse = await fetch(`/api/metadata/${params.contract}/${params.tokenId}`)
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          if (metadata.image) {
            setImageUrl(convertIpfsUrl(metadata.image))
          }
          if (metadata.description) {
            setDescription(metadata.description)
          }
        }
      } catch (error) {
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

  // Helper to get currency symbol
  const getCurrencySymbol = (address: `0x${string}`) => {
    const token = Object.values(SUPPORTED_TOKENS).find((t: SupportedERC20Token) => 
      t.address.toLowerCase() === address.toLowerCase()
    )
    return token?.symbol || 'Unknown'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWallet) {
      toast.error('Please connect your wallet')
      return
    }

    // Validate funds recipient if provided
    if (fundsRecipient && !isValidAddress(fundsRecipient)) {
      toast.error('Invalid funds recipient address')
      return
    }

    setIsUpdating(true)
    try {
      const provider = await activeWallet.getEthereumProvider()
      const walletClient = createWalletClient({
        account: activeWallet.address as `0x${string}`,
        chain: base,
        transport: custom(provider)
      })

      // Create updated config using the centralized formatter
      const updatedConfig = formatSalesConfigForContract({
        saleStart,
        saleEnd,
        price,
        fundsRecipient,
        currency: selectedCurrency || CONTRACTS.usdc // Default to USDC if no currency selected
      })

      // Use encodeSalesConfig instead of direct encoding
      const salesConfigBytes = encodeSalesConfig(updatedConfig, params.tokenId as string)

      // Call the specific contract's callSale function
      const tx = await walletClient.writeContract({
        address: CONTRACTS.specific,
        abi: ABIS.specific,
        functionName: 'callSale',
        args: [BigInt(params.tokenId as string), CONTRACTS.erc20Minter, salesConfigBytes]
      })

      // Wait for transaction
      await publicClient.waitForTransactionReceipt({ hash: tx })

      toast.success('Token updated successfully')
    } catch (error) {
      console.error('Error updating token:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update token')
    } finally {
      setIsUpdating(false)
    }
  }

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
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Current Token Info */}
          <Card className="overflow-hidden bg-primary-dark/30 border-gray-800">
            <CardHeader>
              <CardTitle>Current Token Info</CardTitle>
            </CardHeader>
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
                    <h2 className="text-xl font-semibold mb-1">{tokenInfo?.token.name || `Token #${params.tokenId}`}</h2>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-2">{description}</p>
                    )}
                    {!tokenInfo?.token.name && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Metadata not found in database. Please update metadata using the Neon/Blob.
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                      <p className="text-sm">
                        {tokenInfo?.salesConfig.pricePerToken ? 
                          `$${formatUsdcAmount(tokenInfo.salesConfig.pricePerToken.toString())} USDC` : 
                          'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Supply</p>
                      <p className="text-sm">
                        {tokenInfo?.token ? 
                          formatSupply(tokenInfo.token.totalMinted.toString(), tokenInfo.token.maxSupply.toString()) : 
                          'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Start</p>
                      <p className="text-sm">
                        {tokenInfo?.salesConfig.saleStart ? 
                          formatTimestamp(tokenInfo.salesConfig.saleStart.toString()) : 
                          'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale End</p>
                      <p className="text-sm">{formatSaleEnd(tokenInfo?.salesConfig.saleEnd)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Funds Recipient</p>
                      <p className="font-mono text-sm" title={tokenInfo?.salesConfig.fundsRecipient || ''}>
                        {tokenInfo?.salesConfig.fundsRecipient ? 
                          formatAddress(tokenInfo.salesConfig.fundsRecipient) : 
                          'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-primary-dark/50 rounded-lg border border-gray-800">
                    <p className="text-sm text-muted-foreground">
                      To update token name, description, or image, please use the Neon/Blob
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Update Form */}
          <Card className="bg-primary-dark/30 border-gray-800">
            <CardHeader>
              <CardTitle>Update Token</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="saleStart" className="block text-sm font-medium mb-1">Sale Start</label>
                    <input
                      id="saleStart"
                      type="date"
                      value={saleStart}
                      onChange={(e) => setSaleStart(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-800 bg-black/20 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>

                  <div>
                    <label htmlFor="saleEnd" className="block text-sm font-medium mb-1">Sale End</label>
                    <input
                      id="saleEnd"
                      type="date"
                      value={saleEnd}
                      onChange={(e) => setSaleEnd(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-800 bg-black/20 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    <button
                      type="button"
                      onClick={() => setSaleEnd('')}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      Set to infinite
                    </button>
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium mb-1">Price (USDC)</label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">$</span>
                      </div>
                      <input
                        id="price"
                        type="text"
                        value={price}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '')
                          const error = validateUsdcAmount(value)
                          if (!error) {
                            setPrice(value) // Allow any valid input while typing
                          }
                        }}
                        onBlur={(e) => {
                          // Format the price when user is done typing
                          const value = e.target.value.replace(/,/g, '')
                          const amountFloat = parseFloat(value)
                          if (!isNaN(amountFloat)) {
                            setPrice(amountFloat.toFixed(2))
                          }
                        }}
                        className="w-full rounded-md border border-gray-800 bg-black/20 pl-7 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="fundsRecipient" className="block text-sm font-medium mb-1">Funds Recipient</label>
                    <input
                      id="fundsRecipient"
                      value={fundsRecipient}
                      onChange={(e) => setFundsRecipient(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-800 bg-black/20 px-3 py-2 text-sm text-white font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Max Tokens Per Address</label>
                    <div className="mt-1 px-3 py-2 text-sm text-muted-foreground bg-black/20 rounded-md border border-gray-800">
                      {tokenInfo?.salesConfig.maxTokensPerAddress.toString() === '0' ? 'No limit' : tokenInfo?.salesConfig.maxTokensPerAddress.toString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <Select
                      value={selectedCurrency}
                      onValueChange={(value) => setSelectedCurrency(value as `0x${string}`)}
                    >
                      <SelectTrigger className="mt-1 w-full bg-black/20 border-gray-800">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        {Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => (
                          <SelectItem 
                            key={token.address} 
                            value={token.address}
                            className="hover:bg-gray-800"
                          >
                            {symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Token'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
