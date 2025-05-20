import { type Address } from 'viem'
import { type TokenType, type TokenCategory } from './types'

// NOTE: This module is not fully implemented yet - work in progress

// Native ETH is special case - always available
export const NATIVE_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address

// Default decimals by token type
export const TOKEN_DECIMALS: Partial<Record<TokenType, number>> = {
  native: 18,
  erc20: 18,
  erc721: 0,
  erc1155: 0
}

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address

export const KNOWN_TOKENS: Record<string, { 
  type: TokenType;
  symbol: string;
  categories: TokenCategory[];
  decimals: number;
}> = {
  [NATIVE_ETH_ADDRESS.toLowerCase()]: { 
    type: 'native', 
    symbol: 'ETH',
    categories: ['currency'],
    decimals: 18
  },
  [USDC_ADDRESS.toLowerCase()]: { 
    type: 'erc20', 
    symbol: 'USDC',
    categories: ['currency'],
    decimals: 6
  }
}

// Format configurations for different number ranges
export const FORMAT_CONFIG = {
  smallNumber: {
    minDecimals: 0,
    maxDecimals: 6,
    threshold: 0.000001
  },
  mediumNumber: {
    minDecimals: 0,
    maxDecimals: 4,
    threshold: 0.01
  },
  largeNumber: {
    minDecimals: 0,
    maxDecimals: 2,
    threshold: 1000
  }
} 