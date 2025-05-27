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

// Types for contract return values
type TokenData = {
  totalMinted: bigint
  maxSupply: bigint
  image: string
  name: string
  description: string
}

type SalesConfig = {
  saleStart: bigint
  saleEnd: bigint
  maxTokensPerAddress: bigint
  pricePerToken: bigint
  fundsRecipient: `0x${string}`
  currency: `0x${string}`
}

export type TokenInfo = {
  creator: `0x${string}`
  creationDate: string
  price: string
  name: string
  totalMinted: string
  maxSupply: string
  saleStart: string
  saleEnd: string
  fundsRecipient: `0x${string}`
}

export type UpdateTokenParams = {
  contractAddress: string
  tokenId: string
  fundsRecipient: `0x${string}`
  onStatus?: (status: {
    step: string
    error?: string
    tokenId?: string
  }) => void
  walletClient?: any // Wallet client for transactions
}

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
): Promise<TokenInfo> {
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
    const metadataResponse = await fetch(convertIpfsUrl(tokenUri))
    if (!metadataResponse.ok) {
      throw new Error('Failed to fetch metadata')
    }
    const metadata = await metadataResponse.json()
    console.log('Metadata:', metadata)

    // Get sales config from ERC20 minter
    const salesConfig = await publicClient.readContract({
      address: CONTRACTS.erc20Minter,
      abi: ABIS.erc20Minter,
      functionName: 'sale',
      args: [CONTRACTS.specific, BigInt(tokenId)]
    }) as Promise<SalesConfig>

    const resolvedSalesConfig = await salesConfig
    console.log('Sales config:', resolvedSalesConfig)

    return {
      creator: resolvedSalesConfig.fundsRecipient,
      creationDate: new Date().toISOString(),
      price: resolvedSalesConfig.pricePerToken.toString(),
      name: metadata.name || '',
      totalMinted: tokenData.totalMinted.toString(),
      maxSupply: tokenData.maxSupply.toString(),
      saleStart: resolvedSalesConfig.saleStart.toString(),
      saleEnd: resolvedSalesConfig.saleEnd.toString(),
      fundsRecipient: resolvedSalesConfig.fundsRecipient
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

/**
 * Update token funds recipient
 */
export async function updateFundsRecipient({
  contractAddress,
  tokenId,
  fundsRecipient,
  onStatus,
  walletClient
}: UpdateTokenParams): Promise<void> {
  try {
    onStatus?.({ step: 'updating-funds-recipient' })

    if (!walletClient) {
      throw new Error('Wallet client is required for updating funds recipient')
    }

    // Get current sales config from ERC20 minter
    const currentConfig = await publicClient.readContract({
      address: CONTRACTS.erc20Minter,
      abi: ABIS.erc20Minter,
      functionName: 'sale',
      args: [BigInt(tokenId)]
    }) as Promise<SalesConfig>

    const resolvedConfig = await currentConfig

    // Create updated sales config preserving existing values
    const updatedConfig = {
      saleStart: resolvedConfig.saleStart,
      saleEnd: resolvedConfig.saleEnd,
      maxTokensPerAddress: resolvedConfig.maxTokensPerAddress,
      pricePerToken: resolvedConfig.pricePerToken,
      fundsRecipient: fundsRecipient,
      currency: resolvedConfig.currency
    }

    // Encode the sales config
    const salesConfigBytes = encodeFunctionData({
      abi: ABIS.erc20Minter,
      functionName: 'setSale',
      args: [updatedConfig]
    })

    // Call the specific contract's callSale function
    const tx = await walletClient.writeContract({
      address: CONTRACTS.specific,
      abi: ABIS.specific,
      functionName: 'callSale',
      args: [BigInt(tokenId), CONTRACTS.erc20Minter, salesConfigBytes]
    }) as Hash

    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash: tx })

    onStatus?.({ step: 'complete' })
  } catch (error) {
    console.error('Error updating funds recipient:', error)
    onStatus?.({ 
      step: 'error', 
      error: error instanceof Error ? error.message : 'Failed to update funds recipient'
    })
    throw error
  }
} 