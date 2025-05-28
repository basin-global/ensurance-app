import { base } from 'viem/chains'
import type { Address } from 'viem'
import { createPublicClient, http } from 'viem'
import zora1155ProxyAbi from '@/abi/Zora1155proxy.json'
import zoraErc20MinterAbi from '@/abi/ZoraERC20Minter.json'

// Network config
export const NETWORK = {
  id: base.id,
  name: base.name,
  rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
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

// ===== Formatting Utilities =====

/**
 * Convert a date string to a uint64 timestamp (start of day UTC)
 * Returns 0 if no date is provided or if date is invalid
 */
export const dateToUint64 = (date: string): bigint => {
  if (!date) return BigInt(0)
  // Parse the date in UTC
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  if (isNaN(d.getTime())) return BigInt(0) // Return 0 if invalid date
  return BigInt(Math.floor(d.getTime() / 1000))
}

/**
 * Format a timestamp for display in the UI
 */
export const formatTimestamp = (timestamp: string | undefined): string => {
  if (!timestamp || timestamp === '0') return 'Not set'
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Format a date for input field (UTC)
 */
export const formatDateForInput = (timestamp: string | undefined): string => {
  if (!timestamp || timestamp === '0') return ''
  const date = new Date(Number(timestamp) * 1000)
  return date.toISOString().split('T')[0] // YYYY-MM-DD format in UTC
}

/**
 * Check if a sale is currently active
 */
export const isSaleActive = (
  startTimestamp: string | undefined,
  endTimestamp: string | undefined
): boolean => {
  if (!startTimestamp || startTimestamp === '0') return false
  const now = BigInt(Math.floor(Date.now() / 1000))
  const start = BigInt(startTimestamp)
  const end = endTimestamp ? BigInt(endTimestamp) : BigInt(0)
  
  // If end is 0, sale is infinite
  if (end === BigInt(0)) {
    return start <= now
  }
  
  return start <= now && now < end
}

/**
 * Convert a USDC amount (6 decimals) to a display amount
 * Example: 1000000 -> "1.00"
 */
export const formatUsdcAmount = (amount: string | bigint): string => {
  if (!amount) return '0.00'
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount
  const amountFloat = Number(amountBigInt) / 1_000_000
  return amountFloat.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Convert a display amount to USDC amount (6 decimals)
 * Example: "1.00" -> 1000000, "10" -> 10000000
 */
export const parseUsdcAmount = (amount: string): bigint => {
  if (!amount) return BigInt(0)
  // Handle both "10" and "10.00" formats
  const amountFloat = parseFloat(amount)
  if (isNaN(amountFloat)) return BigInt(0)
  return BigInt(Math.floor(amountFloat * 1_000_000))
}

/**
 * Format a USDC amount with currency symbol
 * Example: 1000000 -> "$1.00 USDC"
 */
export const formatUsdcWithSymbol = (amount: string | bigint): string => {
  return `$${formatUsdcAmount(amount)} USDC`
}

/**
 * Validate a USDC amount
 * Returns error message if invalid, null if valid
 */
export const validateUsdcAmount = (amount: string): string | null => {
  if (!amount) return 'Amount is required'
  
  const amountFloat = parseFloat(amount)
  if (isNaN(amountFloat)) return 'Invalid amount'
  if (amountFloat < 0) return 'Amount must be positive'
  
  // Check if amount has more than 6 decimal places
  const decimals = amount.split('.')[1]?.length || 0
  if (decimals > 6) return 'Amount cannot have more than 6 decimal places'
  
  return null
}

/**
 * Validate a sale configuration
 * Returns error message if invalid, null if valid
 */
export const validateSaleConfig = (
  startDate: string,
  endDate: string,
  price: string
): string | null => {
  // Validate dates
  if (startDate && endDate) {
    const start = dateToUint64(startDate)
    const end = dateToUint64(endDate)
    if (end <= start) {
      return 'End date must be after start date'
    }
  }
  
  // Validate price
  const priceError = validateUsdcAmount(price)
  if (priceError) return priceError
  
  return null
}

// Add SalesConfig type
export type SalesConfig = {
  saleStart: bigint
  saleEnd: bigint
  maxTokensPerAddress: bigint
  pricePerToken: bigint
  fundsRecipient: `0x${string}`
  currency: `0x${string}`
}

/**
 * Format a sales config for contract submission
 * Converts all display values to contract format
 */
export const formatSalesConfigForContract = (config: {
  saleStart?: string
  saleEnd?: string
  price?: string
  fundsRecipient?: string
  maxTokensPerAddress?: string
  currency?: `0x${string}`
}): SalesConfig => {
  return {
    saleStart: dateToUint64(config.saleStart || ''),
    saleEnd: dateToUint64(config.saleEnd || ''),
    maxTokensPerAddress: BigInt(config.maxTokensPerAddress || '0'),
    pricePerToken: parseUsdcAmount(config.price || ''),
    fundsRecipient: (config.fundsRecipient || ZERO_ADDRESS) as `0x${string}`,
    currency: config.currency || ZERO_ADDRESS
  }
}

/**
 * Format a sale end timestamp for display
 * Returns 'No end date' if the sale end is zero or falsy, otherwise formats the timestamp
 */
export const formatSaleEnd = (saleEnd: bigint | string | undefined): string => {
  if (!saleEnd || saleEnd === '0' || saleEnd === BigInt(0)) return 'No end date'
  return formatTimestamp(saleEnd.toString())
} 