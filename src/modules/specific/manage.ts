import { createPublicClient, createWalletClient, custom, http, encodeFunctionData } from 'viem'
import { base } from 'viem/chains'
import { 
  CONTRACTS, 
  ABIS, 
  publicClient,
  type TokenMetadata 
} from './config'
import type { Address } from 'viem'
import { type Hash } from 'viem'
import { toast } from 'react-toastify'
import { encodeSalesConfig, getSalesConfig } from './callSale'
import type { TokenData, SalesConfig } from './types'

// Helper to convert IPFS URLs if needed
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

/**
 * Fetch token information including metadata and sales configuration
 */
export async function getTokenInfo(
  contractAddress: `0x${string}`,
  tokenId: string
): Promise<{ token: TokenData; salesConfig: SalesConfig }> {
  try {
    console.log('Fetching token info for:', { contractAddress, tokenId })
    
    // Get token data from 1155 contract
    const [tokenData, tokenUri] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.specific,
        abi: ABIS.specific,
        functionName: 'getTokenInfo',
        args: [BigInt(tokenId)]
      }) as Promise<TokenData>,
      publicClient.readContract({
        address: CONTRACTS.specific,
        abi: ABIS.specific,
        functionName: 'uri',
        args: [BigInt(tokenId)]
      }) as Promise<string>
    ])

    console.log('Token data from 1155:', tokenData)
    console.log('Token URI:', tokenUri)

    // Fetch metadata from tokenURI
    let metadata = { name: '' }
    try {
      const metadataResponse = await fetch(convertIpfsUrl(tokenUri))
      if (metadataResponse.ok) {
        metadata = await metadataResponse.json()
      }
    } catch (error) {
      console.warn('Failed to fetch metadata, using defaults:', error)
    }
    console.log('Metadata:', metadata)

    // Get sales config from ERC20 minter
    let salesConfig: SalesConfig
    try {
      const config = await publicClient.readContract({
        address: CONTRACTS.erc20Minter,
        abi: ABIS.erc20Minter,
        functionName: 'sale',
        args: [CONTRACTS.specific, BigInt(tokenId)]
      })
      salesConfig = config as SalesConfig
    } catch (error) {
      console.warn('Failed to fetch sales config, using defaults:', error)
      // Default sales config
      salesConfig = {
        saleStart: BigInt(0),
        saleEnd: BigInt(0),
        maxTokensPerAddress: BigInt(0),
        pricePerToken: BigInt(0),
        fundsRecipient: CONTRACTS.specific,
        currency: CONTRACTS.usdc
      }
    }

    console.log('Sales config:', salesConfig)

    return {
      token: {
        ...tokenData,
        name: metadata.name || ''
      },
      salesConfig
    }
  } catch (error) {
    console.error('Error in getTokenInfo:', error)
    throw new Error('Failed to fetch token information')
  }
}

/**
 * Update token URI
 */
export async function updateTokenURI({
  tokenId,
  newUri,
  walletClient
}: {
  tokenId: string
  newUri: string
  walletClient: any
}): Promise<void> {
  try {
    const tx = await walletClient.writeContract({
      address: CONTRACTS.specific,
      abi: ABIS.specific,
      functionName: 'updateTokenURI',
      args: [BigInt(tokenId), newUri]
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  } catch (error) {
    console.error('Error updating token URI:', error)
    throw new Error('Failed to update token URI')
  }
}

/**
 * Reduce token supply
 */
export async function reduceSupply({
  tokenId,
  newMaxSupply,
  walletClient
}: {
  tokenId: string
  newMaxSupply: bigint
  walletClient: any
}): Promise<void> {
  try {
    const tx = await walletClient.writeContract({
      address: CONTRACTS.specific,
      abi: ABIS.specific,
      functionName: 'reduceSupply',
      args: [BigInt(tokenId), newMaxSupply]
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  } catch (error) {
    console.error('Error reducing supply:', error)
    throw new Error('Failed to reduce supply')
  }
}

/**
 * Admin mint tokens
 */
export async function adminMint({
  tokenId,
  to,
  quantity,
  walletClient
}: {
  tokenId: string
  to: `0x${string}`
  quantity: bigint
  walletClient: any
}): Promise<void> {
  try {
    const tx = await walletClient.writeContract({
      address: CONTRACTS.specific,
      abi: ABIS.specific,
      functionName: 'adminMint',
      args: [BigInt(tokenId), to, quantity]
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  } catch (error) {
    console.error('Error admin minting:', error)
    throw new Error('Failed to admin mint')
  }
}

/**
 * Set contract-level funds recipient
 */
export async function setFundsRecipient({
  fundsRecipient,
  walletClient
}: {
  fundsRecipient: `0x${string}`
  walletClient: any
}): Promise<void> {
  try {
    const tx = await walletClient.writeContract({
      address: CONTRACTS.specific,
      abi: ABIS.specific,
      functionName: 'setFundsRecipient',
      args: [fundsRecipient]
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  } catch (error) {
    console.error('Error setting funds recipient:', error)
    throw new Error('Failed to set funds recipient')
  }
} 