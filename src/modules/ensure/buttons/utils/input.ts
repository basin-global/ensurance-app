import { formatUnits, parseEther } from 'viem'
import type { TokenType, TokenInfo } from '../types'
import { getTokenDecimals } from './formatting'

/**
 * Handle amount input changes with formatting and validation
 */
export const handleAmountChange = (
  value: string, 
  tokenType: TokenType,
  maxDecimals?: number
): { cleanValue: string; formattedValue: string; isValid: boolean } => {
  // Remove existing commas first
  const withoutCommas = value.replace(/,/g, '')
  
  let cleanValue: string
  
  if (tokenType === 'erc721') {
    // Only allow whole number (1) for ERC721
    cleanValue = '1'
  } else if (tokenType === 'erc1155') {
    // Only allow whole numbers for ERC1155
    cleanValue = withoutCommas.replace(/[^\d]/g, '')
  } else {
    // Allow numbers and one decimal point for ERC20 and native ETH
    cleanValue = withoutCommas.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    
    // Handle decimal places
    if (cleanValue.includes('.')) {
      const [whole, fraction] = cleanValue.split('.')
      const decimals = maxDecimals || 18
      // Limit decimal places to token's decimals
      if (fraction && fraction.length > decimals) {
        cleanValue = `${whole}.${fraction.slice(0, decimals)}`
      }
    }
  }
  
  // Format with commas for display
  let formattedValue = ''
  if (cleanValue) {
    if (tokenType === 'erc721') {
      formattedValue = '1'
    } else if (tokenType === 'erc1155') {
      formattedValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    } else {
      const parts = cleanValue.split('.')
      const wholeNumber = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      formattedValue = parts.length > 1 ? `${wholeNumber}.${parts[1]}` : wholeNumber
    }
  }
  
  const isValid = cleanValue !== '' && !isNaN(Number(cleanValue)) && Number(cleanValue) > 0
  
  return { cleanValue, formattedValue, isValid }
}

/**
 * Validate amount against balance
 */
export const validateAmount = (
  amount: string,
  balance: string | bigint,
  tokenType: TokenType,
  decimals: number = 18
): string | null => {
  if (!amount || Number(amount) <= 0) {
    return 'Amount must be greater than zero'
  }
  
  try {
    let inputAmount: bigint
    let currentBalance: bigint
    
    if (tokenType === 'erc721') {
      inputAmount = BigInt(1)
      currentBalance = BigInt(balance)
    } else if (tokenType === 'erc1155') {
      inputAmount = BigInt(Math.floor(Number(amount)))
      currentBalance = BigInt(balance)
    } else {
      // For ERC20 and native tokens
      const multiplier = Math.pow(10, decimals)
      inputAmount = BigInt(Math.floor(Number(amount) * multiplier))
      currentBalance = BigInt(balance)
    }
    
    if (inputAmount > currentBalance) {
      return 'Amount exceeds available balance'
    }
    
    return null
  } catch (error) {
    return 'Invalid amount'
  }
}

/**
 * Parse user amount for transaction (convert to BigInt with proper decimals)
 */
export const parseAmount = (amount: string, decimals: number = 18): bigint => {
  // Remove commas from the amount string
  const cleanAmount = amount.replace(/,/g, '')
  // Convert to base units
  const [whole, fraction = ''] = cleanAmount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0')
  const trimmedFraction = paddedFraction.slice(0, decimals)
  const combined = whole + trimmedFraction
  return BigInt(combined)
}

/**
 * Parse amount for different token types
 */
export const parseTokenAmount = (
  amount: string,
  tokenType: TokenType,
  decimals: number = 18
): bigint => {
  if (tokenType === 'erc721') {
    return BigInt(1)
  } else if (tokenType === 'erc1155') {
    return BigInt(Math.floor(Number(amount.replace(/,/g, ''))))
  } else if (tokenType === 'native') {
    return parseEther(amount.replace(/,/g, ''))
  } else {
    // ERC20
    return parseAmount(amount, decimals)
  }
}

/**
 * Check if address is ETH placeholder
 */
export const isEthAddress = (address: string): boolean => {
  return address.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
}

/**
 * Truncate address for display
 */
export const truncateAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
