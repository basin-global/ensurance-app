import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { base } from 'viem/chains'
import { 
  CONTRACTS, 
  ABIS, 
  publicClient,
  type TokenMetadata 
} from './config'
import { toast } from 'react-toastify'

// Types for contract return values
type TokenData = {
  totalMinted: bigint
  maxSupply: bigint
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
    // Get token data from contract
    const [tokenData, tokenUri] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: ABIS.specific,
        functionName: 'getTokenInfo',
        args: [BigInt(tokenId)]
      }) as Promise<TokenData>,
      publicClient.readContract({
        address: contractAddress,
        abi: ABIS.specific,
        functionName: 'uri',
        args: [BigInt(tokenId)]
      }) as Promise<string>
    ])

    // Fetch metadata from tokenURI
    const metadataResponse = await fetch(convertIpfsUrl(tokenUri))
    if (!metadataResponse.ok) {
      throw new Error('Failed to fetch metadata')
    }
    const metadata = await metadataResponse.json()

    // Get sales config
    const salesConfig = await publicClient.readContract({
      address: contractAddress,
      abi: ABIS.specific,
      functionName: 'sale',
      args: [BigInt(tokenId)]
    }) as Promise<SalesConfig>

    const resolvedSalesConfig = await salesConfig

    return {
      creator: resolvedSalesConfig.fundsRecipient,
      creationDate: new Date().toISOString(), // We'll need to get this from events if needed
      price: resolvedSalesConfig.pricePerToken.toString(),
      name: metadata.name || '',
      totalMinted: tokenData.totalMinted.toString(),
      maxSupply: tokenData.maxSupply.toString(),
      saleStart: resolvedSalesConfig.saleStart.toString(),
      saleEnd: resolvedSalesConfig.saleEnd.toString(),
      fundsRecipient: resolvedSalesConfig.fundsRecipient
    }
  } catch (error) {
    console.error('Error fetching token info:', error)
    throw new Error('Failed to fetch token information')
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

    // Get current sales config
    const currentConfig = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ABIS.specific,
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

    // Call the contract's setSale function
    const tx = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: ABIS.specific,
      functionName: 'setSale',
      args: [BigInt(tokenId), updatedConfig]
    })

    await tx.wait()

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