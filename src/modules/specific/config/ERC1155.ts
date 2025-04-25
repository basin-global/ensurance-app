// Main 1155 contract configuration for Specific Ensurance
import { base } from 'viem/chains'
import type { Address } from 'viem'

// Maximum supply for open edition tokens (effectively unlimited)
export const MAX_SUPPLY_OPEN_EDITION = BigInt(2 ** 64 - 1)

/**
 * Base metadata for all tokens
 */
export interface TokenMetadata {
  name: string
  description?: string
  maxSupply?: bigint
  createReferral?: `0x${string}`
}

/**
 * Extended metadata with media content
 */
export interface SpecificMetadata extends TokenMetadata {
  animation_url?: string
  content?: {
    mime: string
    uri: string
  }
}

export const specificContract = {
  address: '0x7DFaa8f8E2aA32b6C2112213B395b4C9889580dd' as const,
  network: {
    id: base.id,
    name: base.name,
    rpcUrl: base.rpcUrls.default.http[0]
  }
} as const

/**
 * Type guard to check if an address is our specific contract
 */
export function isSpecificContract(address: Address): boolean {
  return address.toLowerCase() === specificContract.address.toLowerCase()
} 