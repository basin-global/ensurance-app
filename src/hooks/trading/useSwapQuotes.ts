import useSWR from 'swr'
import { searchConfig } from '@/lib/swr-config'

export interface SwapQuoteParams {
  sellToken: string
  buyToken: string
  sellAmount: string
  taker: string
  slippageBps?: string
  swapFeeBps?: string
}

export interface SwapQuote {
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  allowanceTarget?: string
  price: string
  estimatedGas: string
  transaction?: {
    to: string
    data: string
    value: string
    gas: string
    gasPrice: string
  }
  permit2?: {
    type: string
    hash: string
    eip712: any
  }
  fees?: {
    integratorFee?: any
    zeroExFee?: any
  }
}

export function useSwapQuote(params?: SwapQuoteParams) {
  const query = params ? new URLSearchParams({
    action: 'quote',
    ...params
  }).toString() : null

  const { data, error, mutate, isLoading, isValidating } = useSWR<SwapQuote>(
    query ? `/api/0x?${query}` : null,
    {
      ...searchConfig,
      // Don't cache swap quotes for long as they change frequently
      refreshInterval: 0,
      dedupingInterval: 1000,
      revalidateOnFocus: false,
    }
  )

  return {
    quote: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}