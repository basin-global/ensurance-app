import { encodeFunctionData } from 'viem'
import { ABIS, CONTRACTS, publicClient } from './config'
import type { SalesConfig } from './types'

/**
 * Convert a date string to a uint64 timestamp (start of day UTC)
 * Returns 0 if no date is provided
 */
export const dateToUint64 = (date: string): bigint => {
  if (!date) return BigInt(0)
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return BigInt(Math.floor(d.getTime() / 1000))
}

/**
 * Fetches the current sales config for a token
 */
export async function getSalesConfig(tokenId: string): Promise<SalesConfig> {
  const config = await publicClient.readContract({
    address: CONTRACTS.erc20Minter,
    abi: ABIS.erc20Minter,
    functionName: 'sale',
    args: [CONTRACTS.specific, BigInt(tokenId)]
  }) as Promise<SalesConfig>

  return config
}

/**
 * Encodes a sales config for use with callSale
 * All fields must be provided - no merging with existing values
 */
export function encodeSalesConfig(config: SalesConfig, tokenId: string): `0x${string}` {
  // Encode the sales config
  return encodeFunctionData({
    abi: ABIS.erc20Minter,
    functionName: 'setSale',
    args: [BigInt(tokenId), config]
  })
} 