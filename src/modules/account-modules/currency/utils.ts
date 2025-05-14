import { getChainByName } from '@/config/chains'
import { Asset } from '@/types'

// Format numbers with appropriate commas and decimals
export const formatNumber = (value: string | number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return 'N/A'
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'N/A'
  
  const parts = num.toFixed(decimals).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return parts.join('.')
}

// Determine appropriate number of decimal places based on value
export const getAppropriateDecimals = (value: number): number => {
  if (value === 0) return 2
  const absValue = Math.abs(value)
  if (absValue >= 1) return 2
  return Math.min(8, Math.max(2, -Math.floor(Math.log10(absValue))))
}

// Get block explorer URL for token
export const getExplorerUrl = (chain: string, address: string) => {
  const chainConfig = getChainByName(chain)
  if (!chainConfig?.blockExplorers?.default?.url) {
    return '#'
  }
  
  const cleanAddress = address.includes('.') ? address.split('.')[1] : address
  return `${chainConfig.blockExplorers.default.url}/token/${cleanAddress}`
}

// Get Uniswap URL for token
export const getUniswapUrl = (chain: string, address: string) => {
  const chainConfig = getChainByName(chain)
  if (!chainConfig) return '#'
  
  const cleanAddress = address.includes('.') ? address.split('.')[1] : address
  return `https://app.uniswap.org/#/tokens/${chainConfig.name.toLowerCase()}/${cleanAddress}`
}

// Get display name for chain
export const getChainDisplayName = (chain: string): string => {
  const chainConfig = getChainByName(chain)
  return chainConfig ? chainConfig.name : chain
}

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// Check if token is native to chain
export const isNativeToken = (token: TokenBalance) => {
  return !token.fungible_id
}

// Transform token to Asset type for EnsureModal
export const transformTokenToAsset = (token: TokenBalance, selectedChain: string): Asset => ({
  chain: selectedChain,
  contract_address: token.fungible_id || '',
  token_id: '',
  queried_wallet_balances: token.queried_wallet_balances.map(balance => ({
    quantity_string: balance.quantity_string,
    value_usd_string: balance.value_usd_string
  }))
})

// Types
export interface TokenBalance {
  chain: string
  symbol: string
  fungible_id?: string
  decimals: number
  name?: string
  queried_wallet_balances: Array<{
    quantity_string: string
    value_usd_string: string
  }>
  prices?: Array<{
    value_usd_string: string
    marketplace_name: string
  }>
}

export type GroupedBalances = {
  [chain: string]: TokenBalance[]
}

export function calculateTokenPrice(valueCents: number, quantityString: string): string {
  if (!valueCents || !quantityString) return '0';
  
  const valueUsd = valueCents / 100;
  const quantity = parseFloat(quantityString);
  if (!quantity || quantity === 0) return '0';
  
  const price = valueUsd / quantity;
  if (isNaN(price)) return '0';
  
  // Format based on price magnitude
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.01) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
}

export function calculateNativeTokenPrice(valueCents: number, quantityString: string, decimals: number): string {
  if (!valueCents || !quantityString) return '0';
  
  const valueUsd = valueCents / 100;
  const quantity = parseFloat(quantityString) / Math.pow(10, decimals);
  if (!quantity || quantity === 0) return '0';
  
  const price = valueUsd / quantity;
  if (isNaN(price)) return '0';
  
  // Format based on price magnitude
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.01) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
} 