import { createPublicClient, http } from 'viem'
import type { Address } from 'viem'
import { base } from 'viem/chains'
import { specificContract } from './ERC1155'

/**
 * Shared public client for Protocol SDK
 */
export const publicClient = createPublicClient({
  chain: base,
  transport: http(specificContract.rpcUrl)
})

// USDC on Base
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

/**
 * ERC20 minting configuration
 */
export interface ERC20MintConfig {
  currency: Address
  pricePerToken: bigint
  payoutRecipient: Address  // Address that receives 95% of mint proceeds
}

export interface SupportedERC20Token {
  address: Address
  symbol: string
  decimals: number
  // For future use with price feeds
  priceFeed?: Address
}

// Currently just USDC, but structured for adding more tokens
export const SUPPORTED_TOKENS: Record<string, SupportedERC20Token> = {
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
    // priceFeed: '0x...' // Chainlink or other oracle address for future use
  }
} as const 