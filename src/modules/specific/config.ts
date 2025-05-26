import { base } from 'viem/chains'
import type { Address } from 'viem'
import { createPublicClient, http } from 'viem'
import zora1155ProxyAbi from '@/abi/Zora1155proxy.json'
import zoraErc20MinterAbi from '@/abi/ZoraERC20Minter.json'

// Network config
export const NETWORK = {
  id: base.id,
  name: base.name,
  rpcUrl: 'https://mainnet.base.org'
} as const

// Contract addresses
export const CONTRACTS = {
  specific: '0x7DFaa8f8E2aA32b6C2112213B395b4C9889580dd' as `0x${string}`,
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  erc20Minter: '0x777777E8850d8D6d98De2B5f64fae401F96eFF31' as `0x${string}`
} as const

// Public client
export const publicClient = createPublicClient({
  chain: base,
  transport: http(NETWORK.rpcUrl)
})

// Constants
export const MAX_SUPPLY_OPEN_EDITION = BigInt(2 ** 64 - 1)
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

// Types
export interface TokenMetadata {
  name: string
  description?: string
  maxSupply?: bigint
  createReferral?: `0x${string}`
}

export interface ERC20MintConfig {
  currency: Address
  pricePerToken: bigint
}

export interface SupportedERC20Token {
  address: Address
  symbol: string
  decimals: number
  priceFeed?: Address
}

// Supported tokens
export const SUPPORTED_TOKENS: Record<string, SupportedERC20Token> = {
  USDC: {
    address: CONTRACTS.usdc,
    symbol: 'USDC',
    decimals: 6
  }
} as const

// Contract ABIs
export const ABIS = {
  specific: zora1155ProxyAbi,
  erc20Minter: zoraErc20MinterAbi
} as const

// Helper functions
export function isSpecificContract(address: Address): boolean {
  return address.toLowerCase() === CONTRACTS.specific.toLowerCase()
}

// Contract function selectors (for direct contract calls)
export const CONTRACT_FUNCTIONS = {} as const 