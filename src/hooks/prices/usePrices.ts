import useSWR from 'swr'
import { priceConfig } from '@/lib/swr-config'

export interface EthPriceResponse {
  price: number
  symbol: string
  lastUpdated: number
}

export interface PriceFloorResponse {
  floorPrice: string
  floorPriceUsd: number
  currency: string
  marketplace: string
  lastUpdated: string
}

export function useEthPrice() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<EthPriceResponse>(
    '/api/eth-price',
    priceConfig
  )

  return {
    price: data?.price,
    symbol: data?.symbol,
    lastUpdated: data?.lastUpdated,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function usePriceFloor(contractAddress?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<PriceFloorResponse>(
    contractAddress ? `/api/moralis/price-floor?address=${contractAddress}` : null,
    priceConfig
  )

  return {
    floorPrice: data?.floorPrice,
    floorPriceUsd: data?.floorPriceUsd,
    currency: data?.currency,
    marketplace: data?.marketplace,
    lastUpdated: data?.lastUpdated,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useCurrencies() {
  const { data, error, mutate, isLoading, isValidating } = useSWR(
    '/api/currencies',
    priceConfig
  )

  return {
    currencies: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}