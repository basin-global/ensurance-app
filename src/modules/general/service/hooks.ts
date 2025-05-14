import { usePrivy } from '@privy-io/react-auth'
import { useCallback, useState, useEffect } from 'react'
import { GeneralService } from '.'
import type { CoinDetails, TradingInfo } from './types'

export function useGeneralService() {
  const { user, authenticated } = usePrivy()

  const getCoinDetails = useCallback(async (contractAddress: string): Promise<CoinDetails | null> => {
    return GeneralService.getCoinDetails(contractAddress)
  }, [])

  const getTradingInfo = useCallback(async (contractAddress: string): Promise<TradingInfo | null> => {
    return GeneralService.getTradingInfo(contractAddress)
  }, [])

  const getBuyConfig = useCallback((contractAddress: `0x${string}`, amount: bigint) => {
    if (!authenticated || !user?.wallet?.address) return null
    return GeneralService.getBuyConfig(contractAddress, amount, user.wallet.address as `0x${string}`)
  }, [authenticated, user?.wallet?.address])

  const getSellConfig = useCallback((contractAddress: `0x${string}`, amount: bigint) => {
    if (!authenticated || !user?.wallet?.address) return null
    return GeneralService.getSellConfig(contractAddress, amount, user.wallet.address as `0x${string}`)
  }, [authenticated, user?.wallet?.address])

  return {
    getCoinDetails,
    getTradingInfo,
    getBuyConfig,
    getSellConfig,
    isAuthenticated: authenticated,
    userAddress: user?.wallet?.address as `0x${string}` | undefined
  }
}

export function useTokenPrice(symbol: string = 'ETH') {
  const [price, setPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/eth-price')
        if (!response.ok) throw new Error('Failed to fetch token price')
        const data = await response.json()
        setPrice(data.price)
        setLastUpdated(data.lastUpdated)
      } catch (error) {
        console.error('Error fetching token price:', error)
        // Don't set a fallback price, just log the error
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrice()
    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { price, isLoading, lastUpdated }
}

// Keep the old hook name for backward compatibility
export const useEthPrice = () => useTokenPrice('ETH') 