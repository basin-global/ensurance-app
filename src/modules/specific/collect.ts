import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getToken, getTokensOfContract } from '@zoralabs/protocol-sdk'
import type { TokenMetadata } from './types'

export type TokenDisplayInfo = {
  contract: string
  creator: `0x${string}`
  maxSupply: bigint
  mintType: '1155' | '721' | 'premint'
  tokenURI: string
  totalMinted: bigint
  salesConfig?: {
    pricePerToken: bigint
    saleEnd: bigint
    saleStart: bigint
  }
}

/**
 * Get a single token's information
 */
export async function getTokenInfo(
  contractAddress: `0x${string}`,
  tokenId: string
): Promise<TokenDisplayInfo | null> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    })

    const { token } = await getToken({
      publicClient,
      tokenContract: contractAddress,
      mintType: '1155',
      tokenId: BigInt(tokenId)
    })

    return {
      contract: token.contract.address,
      creator: token.creator,
      maxSupply: token.maxSupply,
      mintType: token.mintType,
      tokenURI: token.tokenURI,
      totalMinted: token.totalMinted,
      salesConfig: token.salesConfig as any // Type assertion needed due to SDK type mismatch
    }
  } catch (error) {
    console.error('Error fetching token info:', error)
    return null
  }
}

/**
 * Get all tokens for a contract
 */
export async function getContractTokens(
  contractAddress: `0x${string}`
): Promise<TokenDisplayInfo[]> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    })

    const response = await getTokensOfContract({
      publicClient,
      tokenContract: contractAddress
    })

    // Log the raw response
    console.log('Raw Zora SDK Response:', {
      tokens: response.tokens,
      raw: response
    })

    return response.tokens.map(token => ({
      contract: token.token.contract.address,
      creator: token.token.creator,
      maxSupply: token.token.maxSupply,
      mintType: token.token.mintType,
      tokenURI: token.token.tokenURI,
      totalMinted: token.token.totalMinted,
      salesConfig: token.token.salesConfig as any // Type assertion needed due to SDK type mismatch
    }))
  } catch (error) {
    console.error('Error fetching contract tokens:', error)
    return []
  }
} 