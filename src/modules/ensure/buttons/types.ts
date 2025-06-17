import type { Address } from 'viem'

export type TokenType = 'native' | 'erc20' | 'erc721' | 'erc1155'
export type OperationType = 'buy' | 'swap' | 'send' | 'burn'
export type ButtonContext = 'general' | 'specific' | 'tokenbound'

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
  variant?: 'grid' | 'list'
  
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
