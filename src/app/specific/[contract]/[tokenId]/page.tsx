'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import VerificationSection from '@/components/layout/verifications/VerificationSection'
import { SplitsWrapper } from '@/providers/splits-provider'
import { Collect } from '@/modules/specific/collect'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getToken } from '@zoralabs/protocol-sdk'
import { useEffect, useState } from 'react'

// Helper function to handle BigInt serialization
const replacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

// Helper to convert IPFS URLs if needed
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export default function TokenPage({
  params
}: {
  params: { contract: string; tokenId: string }
}) {
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const publicClient = createPublicClient({
          chain: base,
          transport: http('https://mainnet.base.org')
        })

        const result = await getToken({
          publicClient,
          tokenContract: params.contract as `0x${string}`,
          mintType: "1155",
          tokenId: BigInt(params.tokenId)
        })

        // Fetch metadata from tokenURI
        const metadataResponse = await fetch(convertIpfsUrl(result.token.tokenURI))
        if (!metadataResponse.ok) {
          throw new Error('Failed to fetch metadata')
        }
        const metadata = await metadataResponse.json()
        
        // Combine token info with metadata
        const combinedInfo = {
          ...result,
          token: {
            ...result.token,
            name: metadata.name,
            description: metadata.description,
            image: convertIpfsUrl(metadata.image)
          }
        }

        setTokenInfo(combinedInfo)
      } catch (error) {
        console.error('Error fetching token info:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch token info')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenInfo()
  }, [params.contract, params.tokenId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader 
          title="specific ensurance"
          showSearch={false}
          showBackArrow={true}
          backLink="/specific"
        />
        <div className="container mx-auto px-4 flex-1 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-medium">Error</h2>
            <p className="text-red-600">{error}</p>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-yellow-800 font-medium">Not Found</h2>
            <p className="text-yellow-600">Token not found</p>
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
        <SplitsWrapper>
          <Collect
            contractAddress={params.contract as `0x${string}`}
            tokenId={params.tokenId}
            tokenInfo={tokenInfo}
            onTokenInfoUpdate={setTokenInfo}
          />
        </SplitsWrapper>
      </div>

      <VerificationSection 
        type="specific"
        name=""
        contractAddress={params.contract}
        tokenId={params.tokenId}
      />
    </div>
  )
}
