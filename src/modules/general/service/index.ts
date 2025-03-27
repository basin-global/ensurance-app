import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getCoin, tradeCoinCall } from '@zoralabs/coins-sdk'
import type { CoinDetails, TradingInfo } from './types'

// Initialize viem client for Base network
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

export const GeneralService = {
  /**
   * Get coin details from Zora API
   */
  async getCoinDetails(contractAddress: string): Promise<CoinDetails | null> {
    try {
      const response = await getCoin({
        address: contractAddress
      })
      
      const coin = response.data?.zora20Token
      if (!coin) return null

      return {
        name: coin.name || '',
        symbol: coin.symbol || '',
        totalSupply: coin.totalSupply || '0',
        totalVolume: coin.totalVolume || '0',
        volume24h: coin.volume24h || '0',
        createdAt: coin.createdAt || '',
        creatorAddress: coin.creatorAddress as `0x${string}` || '0x0000000000000000000000000000000000000000',
        description: coin.description || ''
      }
    } catch (error) {
      console.error('Failed to fetch coin details:', error)
      return null
    }
  },

  /**
   * Get trading info for a coin
   */
  async getTradingInfo(contractAddress: string): Promise<TradingInfo | null> {
    try {
      const response = await getCoin({
        address: contractAddress
      })
      
      const coin = response.data?.zora20Token
      if (!coin) return null

      // Convert string values to numbers, handling potential decimals
      const totalVolume = parseFloat(coin.totalVolume || '0')
      const totalSupply = parseFloat(coin.totalSupply || '0')
      const volume24h = parseFloat(coin.volume24h || '0')

      // Calculate price, handling division by zero
      const price = totalSupply > 0 ? (totalVolume / totalSupply).toString() : '0'

      return {
        totalVolume: totalVolume.toString(),
        volume24h: volume24h.toString(),
        price
      }
    } catch (error) {
      console.error('Failed to fetch trading info:', error)
      return null
    }
  },

  /**
   * Get transaction config for buying coins - to be used with wagmi's useContractWrite
   */
  getBuyConfig(contractAddress: `0x${string}`, amount: bigint, recipient: `0x${string}`) {
    return tradeCoinCall({
      direction: 'buy',
      target: contractAddress,
      args: {
        recipient,
        orderSize: amount
      }
    })
  },

  /**
   * Get transaction config for selling coins - to be used with wagmi's useContractWrite
   */
  getSellConfig(contractAddress: `0x${string}`, amount: bigint, recipient: `0x${string}`) {
    return tradeCoinCall({
      direction: 'sell',
      target: contractAddress,
      args: {
        recipient,
        orderSize: amount
      }
    })
  }
} 