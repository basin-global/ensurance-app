import useSWR from 'swr'
import { blockchainConfig } from '@/lib/swr-config'

export interface TokenBalance {
  contractAddress: string
  tokenBalance: string
  tokenMetadata?: {
    name: string
    symbol: string
    decimals: number
    logo?: string
  }
  price?: {
    value: number
    currency: string
  }
}

export interface WalletBalancesResponse {
  address: string
  tokenBalances: TokenBalance[]
  totalValueUsd?: number
}

export function useWalletBalances(address?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<WalletBalancesResponse>(
    address ? `/api/alchemy/fungible?address=${address}` : null,
    blockchainConfig
  )

  return {
    balances: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useWalletNFTs(address?: string, contractAddresses?: string[]) {
  const query = new URLSearchParams()
  if (address) query.append('address', address)
  if (contractAddresses?.length) {
    query.append('contractAddresses', contractAddresses.join(','))
  }

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    address ? `/api/alchemy/nonfungible?${query.toString()}` : null,
    blockchainConfig
  )

  return {
    nfts: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}