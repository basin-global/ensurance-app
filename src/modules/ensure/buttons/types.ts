import type { Address } from 'viem'

export type TokenType = 'native' | 'erc20' | 'erc721' | 'erc1155'
export type Operation = 'buy' | 'swap' | 'send' | 'burn'
export type ButtonContext = 'general' | 'specific' | 'tokenbound' | 'operator'

// Legacy type alias for backwards compatibility
export type OperationType = Operation

export interface TokenInfo {
  symbol: string
  address: Address
  decimals: number
  balance?: string
  type?: 'native' | 'currency' | 'certificate'
  imageUrl?: string
}

export interface AccountSearchResult {
  name: string
  path: string
  type: 'account'
  is_agent: boolean
  is_ensurance: boolean
  token_id: number
}

export interface EnsureButtonsProps {
  // Core token info
  contractAddress: Address
  tokenId?: string
  tokenType?: TokenType
  
  // Button config
  showMinus?: boolean
  showBurn?: boolean
  showSend?: boolean
  showSwap?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'grid' | 'list' | 'page'
  
  // Display options
  imageUrl?: string
  showBalance?: boolean
  tokenName?: string
  tokenSymbol?: string
  
  // Context-specific props
  context: ButtonContext
  tbaAddress?: Address
  isOwner?: boolean
  isDeployed?: boolean
  
  // Balance data (for portfolio integration)
  initialBalance?: string
  
  // Specific token props (ERC1155)
  maxSupply?: bigint
  totalMinted?: bigint
  pricePerToken?: bigint
  primaryMintActive?: boolean
}

export interface OperationParams {
  amount?: string
  recipient?: string
  selectedToken?: TokenInfo
  selectedAccount?: AccountSearchResult
}

export interface TransactionResult {
  success: boolean
  txHash?: string
  error?: string
}

export interface BalanceInfo {
  raw: string
  formatted: string
  symbol: string
  decimals: number
}

export interface QuoteResult {
  estimatedOutput: string
  isLoading: boolean
  liquidityAvailable: boolean
  error?: string
}

// New types for ERC1155/USDC operations
export interface UsdcOperationData {
  totalPrice: bigint
  quantity: bigint
  needsApproval: boolean
  userBalance: bigint
  pricePerToken: bigint
}

export interface ERC1155BalanceInfo {
  tokenBalance: bigint
  usdcBalance: bigint
  formattedTokenBalance: string
  formattedUsdcBalance: string 
}

// Constants for specific contract operations
export const SPECIFIC_CONTRACTS = {
  specific: '0x7DFaa8f8E2aA32b6C2112213B395b4C9889580dd' as Address,
  usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as Address,
  erc20Minter: '0x777777e8850d8d6d98de2b5f64fae401f96eff31' as Address,
  mintReferral: '0x3CeDe7eae1feA81b4AEFf1f348f7497e6794ff96' as Address,
  proceeds: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e' as Address
} as const
