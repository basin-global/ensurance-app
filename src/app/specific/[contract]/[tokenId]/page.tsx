'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { formatUnits } from 'viem'
import { getTokenInfo, type TokenDisplayInfo } from '@/modules/specific/collect'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { MAX_SUPPLY_OPEN_EDITION } from '@/modules/specific/config'
import EnsureButtons from '@/modules/ensure/buttons/EnsureButtonsDetails'
import VerificationSection from '@/components/layout/verifications/VerificationSection'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Proceeds } from '@/modules/proceeds/components/Proceeds'
import { TokenPriceDisplay } from '@/components/layout/TokenPriceDisplay'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Status dot component
const StatusDot = ({ active }: { active: boolean }) => {
  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"
  
  return (
    <span className={cn(
      statusDotClasses,
      active 
        ? "bg-green-500 after:bg-green-500/50" 
        : "bg-red-500 after:bg-red-500/50"
    )} />
  )
}

export default function SpecificTokenPage({
  params
}: {
  params: { contract: string; tokenId: string }
}) {
  const [tokenInfo, setTokenInfo] = useState<TokenDisplayInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [metadata, setMetadata] = useState<{ 
    image?: string;
    name?: string;
    description?: string;
  } | null>(null)
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [priceData, setPriceData] = useState<{
    averagePrice: number | null;
    averagePriceUsd: number | null;
    floorPrice: number | null;
    floorPriceUsd: number | null;
  }>({
    averagePrice: null,
    averagePriceUsd: null,
    floorPrice: null,
    floorPriceUsd: null
  })

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        setLoading(true)
        const info = await getTokenInfo(params.contract as `0x${string}`, params.tokenId)
        console.log('Zora SDK returned:', info)
        setTokenInfo(info)

        // Fetch metadata if we have a tokenURI
        if (info?.tokenURI) {
          try {
            let metadataData
            if (info.tokenURI.startsWith('http')) {
              // Handle HTTP URLs (like our API metadata route)
              const response = await fetch(info.tokenURI + `?t=${Date.now()}`)
              if (!response.ok) throw new Error('Failed to fetch metadata')
              metadataData = await response.json()
            } else {
              // Handle IPFS URLs
              const uri = convertIpfsUrl(info.tokenURI)
              const response = await fetch(uri + `?t=${Date.now()}`)
              if (!response.ok) throw new Error('Failed to fetch metadata')
              metadataData = await response.json()
            }
            
            console.log('Metadata response:', metadataData)
            setMetadata(metadataData)
            
            // Get image URL from metadata
            if (metadataData?.image) {
              const imageUrl = metadataData.image.startsWith('ipfs://')
                ? convertIpfsUrl(metadataData.image) + `?t=${Date.now()}`
                : metadataData.image + `?t=${Date.now()}`
              console.log('Setting image URL from metadata:', imageUrl)
              setImageUrl(imageUrl)
            } else {
              console.warn('No image found in metadata')
              setImageUrl(FALLBACK_IMAGE)
            }
          } catch (err) {
            console.warn('Failed to fetch metadata:', err)
            setImageUrl(FALLBACK_IMAGE)
          }
        } else {
          console.warn('No tokenURI found')
          setImageUrl(FALLBACK_IMAGE)
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
  }, [params.contract, params.tokenId])

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        // Get floor price
        const floorResponse = await fetch(`/api/moralis/price-floor?address=${params.contract}`);
        const floorData = floorResponse.ok ? await floorResponse.json() : null;
        
        // Get sales data
        const salesResponse = await fetch(`/api/moralis/contract-sales?address=${params.contract}`);
        const salesData = salesResponse.ok ? await salesResponse.json() : null;
        
        // Get ETH price
        const ethPriceResponse = await fetch('/api/eth-price');
        const ethPriceData = ethPriceResponse.ok ? await ethPriceResponse.json() : null;
        const ethPrice = ethPriceData?.price || 0;

        // Process floor price
        const floorPrice = floorData?.floor_price ? parseFloat(floorData.floor_price) : null;
        const floorPriceUsd = floorPrice ? floorPrice * ethPrice : null;

        // Process sales data
        const averagePrice = salesData?.average_sale?.price_formatted ? parseFloat(salesData.average_sale.price_formatted) : null;
        const averagePriceUsd = averagePrice ? averagePrice * ethPrice : null;

        setPriceData({
          averagePrice,
          averagePriceUsd,
          floorPrice,
          floorPriceUsd
        });
      } catch (err) {
        console.error('Error fetching price data:', err);
      }
    };

    fetchPriceData();
  }, [params.contract]);

  const renderDescription = (description: string) => {
    if (!description) return null;
    
    const maxLength = 150;
    const shouldTruncate = description.length > maxLength;
    
    if (!shouldTruncate) {
      return <ReactMarkdown>{description}</ReactMarkdown>;
    }

    const displayText = isDescriptionExpanded 
      ? description 
      : `${description.slice(0, maxLength)}...`;

    return (
      <div className="space-y-2">
        <ReactMarkdown>{displayText}</ReactMarkdown>
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader 
          title="specific ensurance"
          showSearch={false}
          showBackArrow={true}
          backLink="/specific"
        />
        <div className="container mx-auto px-4 flex-1 pb-12">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-800 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-800 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader 
          title="specific ensurance"
          showSearch={false}
          showBackArrow={true}
          backLink="/specific"
        />
        <div className="container mx-auto px-4 flex-1 pb-12">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <h2 className="text-red-400 font-medium">Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader 
          title="specific ensurance"
          showSearch={false}
          showBackArrow={true}
          backLink="/specific"
        />
        <div className="container mx-auto px-4 flex-1 pb-12">
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
            <h2 className="text-yellow-400 font-medium">Not Found</h2>
            <p className="text-yellow-300">Token not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader 
        title="specific ensurance"
        showSearch={false}
        showBackArrow={true}
        backLink="/specific"
      />
      
      <div className="container mx-auto px-4 flex-1 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Media Display */}
          <Card className="bg-primary-dark border-0">
            <CardContent className="p-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                <Image
                  src={imageUrl}
                  alt={metadata?.name || 'Token'}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  className="object-cover"
                  unoptimized={true}
                  onError={(e: any) => {
                    console.warn('Image failed to load:', imageUrl)
                    e.target.src = FALLBACK_IMAGE
                  }}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white">
                {metadata?.name ? (
                  <>
                    {metadata.name.split('|')[0].trim()}
                    {metadata.name.includes('|') && (
                      <div className="text-lg text-gray-400 mt-1">
                        {metadata.name.split('|')[1].trim()}
                      </div>
                    )}
                  </>
                ) : 'Unnamed Token'}
              </h1>
              {metadata?.description && (
                <div className="prose dark:prose-invert max-w-none prose-strong:text-white">
                  <div className="text-base leading-relaxed text-gray-200">
                    {renderDescription(metadata.description)}
                  </div>
                </div>
              )}
            </div>
            
            {/* Token Info */}
            <Card className="bg-primary-dark/50 border-0">
              <CardContent className="p-6">
                {/* Top row: Price and Market Info */}
                <div className="flex flex-row gap-8 items-start mb-6">
                  {/* Left: Price Info */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex flex-row items-center gap-x-2">
                      <span className="text-gray-400 w-12">price</span>
                      <span className="flex items-baseline font-medium text-white tabular-nums gap-x-1">
                        <span className="inline-block text-right" style={{ width: '1.2em' }}>$</span>
                        <span className="inline-block text-right" style={{ width: '4em' }}>
                          {tokenInfo.salesConfig?.pricePerToken 
                            ? `${Number(formatUnits(tokenInfo.salesConfig.pricePerToken, 6)).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                                useGrouping: false
                              })}`
                            : 'N/A'}
                        </span>
                        <span className="ml-1 text-xs text-gray-400 font-normal">ea</span>
                      </span>
                    </div>
                    <div className="flex flex-row items-center gap-x-2">
                      <span className="text-gray-400 w-12">market</span>
                      <TokenPriceDisplay
                        averagePrice={priceData.averagePrice}
                        averagePriceUsd={priceData.averagePriceUsd}
                        floorPrice={priceData.floorPrice}
                        floorPriceUsd={priceData.floorPriceUsd}
                        configuredPrice={tokenInfo.salesConfig?.pricePerToken 
                          ? parseFloat(formatUnits(tokenInfo.salesConfig.pricePerToken, 6))
                          : null}
                        className="font-medium text-white tabular-nums gap-x-1"
                        alignDollarSign
                        dollarWidth="1.2em"
                        numberWidth="4em"
                      />
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-row items-center justify-end flex-1">
                    <EnsureButtons
                      contractAddress={params.contract}
                      tokenId={params.tokenId}
                      tokenType="erc1155"
                      context="specific"
                      imageUrl={imageUrl}
                      tokenName={metadata?.name}
                      tokenSymbol={metadata?.name || 'Certificate'}
                      pricePerToken={tokenInfo.salesConfig?.pricePerToken}
                      primaryMintActive={true}
                    />
                  </div>
                </div>

                {/* Bottom row: Supply Info */}
                <div className="flex flex-row items-center gap-x-2">
                  <span className="text-gray-400 w-12">supply</span>
                  <span className="font-medium text-white tabular-nums text-right" style={{ minWidth: '6em', display: 'inline-block' }}>
                    {tokenInfo.totalMinted.toString()} / {tokenInfo.maxSupply >= MAX_SUPPLY_OPEN_EDITION - BigInt(1) ? '∞' : tokenInfo.maxSupply.toString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Proceeds Section */}
            <Proceeds
              variant="specific"
              tokenId={params.tokenId}
              payout_recipient={tokenInfo.salesConfig?.fundsRecipient || ''}
            />
          </div>
        </div>
      </div>

      <VerificationSection 
        type="specific"
        name={metadata?.name || 'Unnamed Token'}
        contractAddress={params.contract}
        tokenId={params.tokenId}
      />
    </div>
  )
}
