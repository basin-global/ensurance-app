import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { base } from 'viem/chains'
import { CONTRACTS, ABIS, publicClient } from './config'
import type { TokenMetadata } from './types'

export type CollectParams = {
  tokenId: string
  quantity: bigint
  recipient: `0x${string}`
  walletClient: any
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export type SalesConfig = {
  saleStart: bigint
  saleEnd: bigint
  maxTokensPerAddress: bigint
  pricePerToken: bigint
  fundsRecipient: `0x${string}`
  currency: `0x${string}`
}

/**
 * Get sales config for a token
 */
export async function getSalesConfig(tokenId: string): Promise<SalesConfig> {
  try {
    const config = await publicClient.readContract({
      address: CONTRACTS.erc20Minter,
      abi: ABIS.erc20Minter,
      functionName: 'sale',
      args: [BigInt(tokenId)]
    })
    return config as SalesConfig
  } catch (error) {
    console.error('Error fetching sales config:', error)
    throw new Error('Failed to fetch sales config')
  }
}

/**
 * Mint a token using ERC20 minter
 */
export async function collectToken({
  tokenId,
  quantity,
  recipient,
  walletClient,
  onSuccess,
  onError
}: CollectParams): Promise<void> {
  try {
    const mintReferral = '0x3CeDe7eae1feA81b4AEFf1f348f7497e6794ff96' as `0x${string}`

    // TODO: Implement Permit2 approval
    // For now, we'll assume the token is already approved

    // Execute mint transaction
    const hash = await walletClient.writeContract({
      address: CONTRACTS.erc20Minter,
      abi: ABIS.erc20Minter,
      functionName: 'mint',
      args: [
        BigInt(tokenId),
        quantity,
        mintReferral,
        recipient,
        '' // Empty string for no comment
      ],
      account: recipient
    })

    await publicClient.waitForTransactionReceipt({ hash })
    onSuccess?.()
  } catch (error) {
    console.error('Mint failed:', error)
    onError?.(error instanceof Error ? error : new Error('Failed to collect'))
  }
} 