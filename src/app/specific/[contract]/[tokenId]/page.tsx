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
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`
  }
  return url
}

export default function TokenPage({
  params
}: {
  params: { contract: string; tokenId: string }
}) {
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
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

        console.log('Token URI from Zora:', result.token.tokenURI)

        // Fetch metadata from tokenURI
        const metadataResponse = await fetch(result.token.tokenURI)
        const metadata = await metadataResponse.json()

        // Just use the metadata directly
        setTokenInfo(metadata)
      } catch (error) {
        console.error('Error fetching token info:', error)
      }
    }

    fetchTokenInfo()
  }, [params.contract, params.tokenId])

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
