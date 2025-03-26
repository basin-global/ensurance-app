import { usePrivy } from '@privy-io/react-auth'
import { useCallback } from 'react'
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