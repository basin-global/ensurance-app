import { parseEther, formatEther, type Address } from 'viem'
import { NATIVE_ETH_ADDRESS, TOKEN_DECIMALS, FORMAT_CONFIG } from './constants'
import { currencies } from '@/lib/database/config/currencies'
import type { Token, TokenType } from './types'

// NOTE: This module is not fully implemented yet - work in progress

/**
 * Gets token info from address, returns null if not found
 */
export async function getTokenInfo(tokenAddress: Address): Promise<Token | null> {
  // Handle native ETH specially
  if (tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
    return {
      address: NATIVE_ETH_ADDRESS,
      chain: 'base',
      type: 'native',
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      categories: ['currency'],
      isApproved: false
    }
  }

  // Get from database
  const dbToken = await currencies.getByAddress(tokenAddress)
  if (!dbToken) return null

  return {
    address: tokenAddress,
    chain: dbToken.chain,
    type: 'erc20',
    symbol: dbToken.symbol,
    name: dbToken.name,
    decimals: dbToken.decimals,
    categories: ['currency'],
    isApproved: false
  }
}

/**
 * Gets the number of decimals for a token
 */
export async function getTokenDecimals(tokenAddress: Address): Promise<number> {
  // Handle native ETH specially
  if (tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
    return 18
  }

  // Get from database
  const dbToken = await currencies.getByAddress(tokenAddress)
  if (dbToken?.decimals != null) return dbToken.decimals
  
  // Default to 18 for unknown tokens
  return 18
}

/**
 * Formats a number based on its size
 */
function formatBasedOnSize(num: number): string {
  if (num === 0) return '0'
  
  const { smallNumber, mediumNumber, largeNumber } = FORMAT_CONFIG
  
  if (num < smallNumber.threshold) return `< ${smallNumber.threshold}`
  if (num < mediumNumber.threshold) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: smallNumber.minDecimals,
      maximumFractionDigits: smallNumber.maxDecimals
    })
  }
  if (num < largeNumber.threshold) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: mediumNumber.minDecimals,
      maximumFractionDigits: mediumNumber.maxDecimals
    })
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: largeNumber.minDecimals,
    maximumFractionDigits: largeNumber.maxDecimals
  })
}

interface FormatTokenAmountParams {
  amount: string | number | bigint
  tokenAddress: Address
  displayDecimals?: number
}

/**
 * Formats a token amount for display
 */
export async function formatTokenAmount({ 
  amount, 
  tokenAddress,
  displayDecimals 
}: FormatTokenAmountParams): Promise<string> {
  if (!amount) return '0'

  const decimals = await getTokenDecimals(tokenAddress)
  const tokenInfo = await getTokenInfo(tokenAddress)
  
  let numericAmount: number
  
  // Convert from BigInt/string if needed
  if (typeof amount === 'bigint') {
    numericAmount = Number(amount) / Math.pow(10, decimals)
  } else if (typeof amount === 'string') {
    numericAmount = Number(amount)
  } else {
    numericAmount = amount
  }

  // If specific display decimals are requested
  if (displayDecimals !== undefined) {
    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals
    })
  }

  // Special handling for USDC
  if (tokenInfo?.symbol === 'USDC') {
    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return formatBasedOnSize(numericAmount)
}

interface ConvertTokenAmountParams {
  amount: string | number
  tokenAddress: Address
  toWei?: boolean
}

/**
 * Converts a token amount to or from wei
 */
export async function convertTokenAmount({ 
  amount, 
  tokenAddress, 
  toWei = true 
}: ConvertTokenAmountParams): Promise<string> {
  const decimals = await getTokenDecimals(tokenAddress)
  
  if (toWei) {
    if (decimals === 18) {
      return parseEther(amount.toString()).toString()
    }
    // For non-18 decimal tokens (like USDC)
    const value = Number(amount) * Math.pow(10, decimals)
    return BigInt(Math.floor(value)).toString()
  } else {
    if (decimals === 18) {
      return formatEther(BigInt(amount))
    }
    // For non-18 decimal tokens
    return (Number(amount) / Math.pow(10, decimals)).toString()
  }
}

/**
 * Formats a token balance for display
 */
export async function formatTokenBalance(balance: bigint, tokenAddress: Address): Promise<string> {
  return formatTokenAmount({
    amount: balance,
    tokenAddress
  })
}

/**
 * Validates and formats an input amount
 */
export function formatInputAmount(value: string): string {
  // Remove existing commas
  const withoutCommas = value.replace(/,/g, '')
  
  // Only allow numbers and one decimal point
  const cleanValue = withoutCommas.replace(/[^\d.]/g, '')
  
  // Prevent multiple decimal points
  const parts = cleanValue.split('.')
  if (parts.length > 2) return parts[0] + '.' + parts[1]
  
  // Format with commas
  if (cleanValue) {
    const parts = cleanValue.split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart
  }
  
  return cleanValue
} 