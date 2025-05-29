import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getToken, getTokensOfContract, mint } from '@zoralabs/protocol-sdk'
import type { TokenMetadata } from './types'

// Type for the sales config structure
type SalesConfig = {
  pricePerToken: bigint
  saleEnd: bigint
  saleStart: bigint
}

// Type for the raw token data from Zora SDK
type ZoraTokenData = {
  token: {
    contract: { address: string }
    creator: `0x${string}`
    maxSupply: bigint
    mintType: '1155' | '721' | 'premint'
    tokenURI: string
    totalMinted: bigint
    primaryMintActive: boolean
    salesConfig?: {
      pricePerToken: bigint
      saleEnd: bigint
      saleStart: bigint
    }
  }
}

export type TokenDisplayInfo = {
  contract: string
  creator: `0x${string}`
  maxSupply: bigint
  mintType: '1155' | '721' | 'premint'
  tokenURI: string
  totalMinted: bigint
  primaryMintActive: boolean
  salesConfig?: SalesConfig
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

    // Type assertion for the raw token data
    const rawToken = token as unknown as {
      contract: { address: string }
      creator: `0x${string}`
      maxSupply: bigint
      mintType: '1155' | '721' | 'premint'
      tokenURI: string
      totalMinted: bigint
      salesConfig?: SalesConfig
    }

    return {
      contract: rawToken.contract.address,
      creator: rawToken.creator,
      maxSupply: rawToken.maxSupply,
      mintType: rawToken.mintType,
      tokenURI: rawToken.tokenURI,
      totalMinted: rawToken.totalMinted,
      primaryMintActive: true, // Default to true for single token view
      salesConfig: rawToken.salesConfig
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

    return response.tokens.map(token => {
      // Type assertion for the raw token data
      const rawToken = token as unknown as {
        token: {
          contract: { address: string }
          creator: `0x${string}`
          maxSupply: bigint
          mintType: '1155' | '721' | 'premint'
          tokenURI: string
          totalMinted: bigint
          salesConfig?: SalesConfig
        }
        primaryMintActive?: boolean
      }

      return {
        contract: rawToken.token.contract.address,
        creator: rawToken.token.creator,
        maxSupply: rawToken.token.maxSupply,
        mintType: rawToken.token.mintType,
        tokenURI: rawToken.token.tokenURI,
        totalMinted: rawToken.token.totalMinted,
        primaryMintActive: rawToken.primaryMintActive ?? true,
        salesConfig: rawToken.token.salesConfig
      }
    })
  } catch (error) {
    console.error('Error fetching contract tokens:', error)
    return []
  }
}

/**
 * Mint tokens using Zora's SDK
 */
export async function mintTokens(
  contractAddress: `0x${string}`,
  tokenId: string,
  quantity: number,
  minterAccount: `0x${string}`,
  publicClient: any
) {
  try {
    const { parameters } = await mint({
      tokenContract: contractAddress,
      mintType: '1155',
      tokenId: BigInt(tokenId),
      quantityToMint: quantity,
      minterAccount,
      publicClient,
    })

    return parameters
  } catch (error) {
    console.error('Error preparing mint transaction:', error)
    throw error
  }
} 