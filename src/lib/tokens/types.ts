import { Address } from 'viem'

// NOTE: This module is not fully implemented yet - work in progress

export type TokenType = 'native' | 'erc20' | 'erc721' | 'erc1155'
export type TokenCategory = 'currency' | 'certificate' | 'general' | 'specific'

export interface Token {
  address: Address
  chain: string
  type: TokenType
  symbol: string
  name: string
  decimals?: number
  isApproved: boolean
  categories: TokenCategory[]
  priceFeedAddress?: Address
  metadata?: Record<string, any>
}

export interface SpamContract {
  address: Address
  chain: string
  reason?: string
  addedAt: Date
}

export interface TokenBalance {
  token: Token
  balance: bigint
  valueUsd?: number
  priceUsd?: number
  priceSource?: string
}

export interface TokenMetadata {
  description?: string
  image?: string
  externalUrl?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  [key: string]: any
} 