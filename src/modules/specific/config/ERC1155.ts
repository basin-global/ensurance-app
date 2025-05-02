// Main 1155 contract configuration for Specific Ensurance
import { base } from 'viem/chains'
import type { Address } from 'viem'
import { createPublicClient, http } from 'viem'

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
  address: '0x...' as `0x${string}`,
  rpcUrl: 'https://mainnet.base.org',
  network: {
    id: base.id,
    name: base.name
  }
} as const

export const SPECIFIC_CONTRACT_ADDRESS = specificContract.address

export const publicClient = createPublicClient({
  chain: base,
  transport: http(specificContract.rpcUrl)
})

export type SalesConfig = {
  price: bigint
  maxSupply?: bigint
  startTime?: bigint
  endTime?: bigint
  maxTokensPerAddress?: bigint
}

export type TokenParams = {
  contractAddress: `0x${string}`
  tokenMetadataURI: string
  payoutRecipient: `0x${string}`
  salesConfig: SalesConfig
}

/**
 * Type guard to check if an address is our specific contract
 */
export function isSpecificContract(address: Address): boolean {
  return address.toLowerCase() === specificContract.address.toLowerCase()
} 