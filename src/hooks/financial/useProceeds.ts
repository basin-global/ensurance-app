import useSWR from 'swr'
import { userDataConfig } from '@/lib/swr-config'

export interface ProceedsData {
  contract_address: string
  total_proceeds: string
  currency: string
  transactions: Array<{
    amount: string
    timestamp: string
    transaction_hash: string
  }>
}

export interface PoolData {
  address: string
  name: string
  token0: {
    address: string
    symbol: string
    decimals: number
  }
  token1: {
    address: string
    symbol: string
    decimals: number
  }
  liquidity: string
  volume24h: string
  fees24h: string
}

export function useProceeds(contractAddress?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<ProceedsData>(
    contractAddress ? `/api/proceeds?contract=${contractAddress}` : '/api/proceeds',
    userDataConfig
  )

  return {
    proceeds: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function usePools() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<PoolData[]>(
    '/api/pools',
    userDataConfig
  )

  return {
    pools: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}