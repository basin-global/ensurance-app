import { formatEther, formatUnits } from 'viem'
import type { TokenType } from '../types'

/**
 * Format a number for display with appropriate decimals and commas
 */
export const formatNumber = (num: number, decimals: number = 18): string => {
  if (num === 0) return '0'
  if (num < 0.000001) return '< 0.000001'
  
  // For tokens with lower decimals (like USDC), show more precise amounts
  if (decimals <= 8) {
    if (num < 0.01) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }
  
  // For tokens with high decimals (like ETH)
  if (num < 0.01) return num.toFixed(6)
  if (num < 1) return num.toFixed(4)
  if (num < 1000) {
    const fixed = num.toFixed(2)
    return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
  }
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

/**
 * Format token balance for display
 */
export const formatTokenBalance = (balance: string | undefined, decimals: number): number => {
  if (!balance) return 0
  const divisor = Math.pow(10, decimals)
  return Number(BigInt(balance)) / divisor
}

/**
 * Format balance based on token type
 */
export const formatBalance = (rawBalance: string | bigint, tokenType: TokenType, decimals?: number): string => {
  if (tokenType === 'erc721') {
    return '1'
  }
  
  if (tokenType === 'erc1155') {
    return rawBalance.toString()
  }
  
  // For fungible tokens (ETH and ERC20)
  const formatted = tokenType === 'native' 
    ? formatEther(BigInt(rawBalance))
    : formatUnits(BigInt(rawBalance), decimals || 18)
  
  const value = parseFloat(formatted)
  
  // For values >= 1, show full number with commas, no decimals
  if (value >= 1) {
    return Math.floor(value).toLocaleString('en-US')
  }
  
  // For small values, show more decimals to capture small amounts
  return value.toLocaleString('en-US', { 
    minimumSignificantDigits: 1,
    maximumSignificantDigits: 6
  })
}

/**
 * Format input value with appropriate decimals for display
 */
export const formatInputValue = (value: string): string => {
  const num = Number(value)
  if (num === 0 || isNaN(num)) return '0'
  
  if (num < 1) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    })
  } else if (num < 1000) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    })
  } else {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }
}

/**
 * Get token decimals based on token info
 */
export const getTokenDecimals = (symbol?: string, decimals?: number): number => {
  if (decimals) return decimals
  if (symbol === 'USDC') return 6
  return 18 // Default for most tokens
}
