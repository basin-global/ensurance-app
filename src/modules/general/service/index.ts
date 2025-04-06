import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getCoin, tradeCoin } from '@zoralabs/coins-sdk'
import type { CoinDetails, TradingInfo, TradeConfig, ZoraTradeConfig } from './types'
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'

// Initialize viem client for Base network
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

export const TRADE_REFERRER = '0x7EdDce062a290c59feb95E2Bd7611eeE24610A6b' as `0x${string}`

export const GeneralService = {
  /**
   * Get ETH balance for an address
   */
  async getEthBalance(address: `0x${string}`): Promise<bigint> {
    try {
      return await publicClient.getBalance({ address })
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error)
      return BigInt(0)
    }
  },

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: `0x${string}`, address: `0x${string}`): Promise<bigint> {
    try {
      return await publicClient.readContract({
        address: tokenAddress,
        abi: ZORA_COIN_ABI,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
      return BigInt(0)
    }
  },

  /**
   * Get coin details from Zora API
   */
  async getCoinDetails(contractAddress: string): Promise<CoinDetails | null> {
    try {
      const response = await getCoin({
        address: contractAddress,
        chain: 8453 // Base chain ID
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
        description: coin.description || '',
        marketCap: coin.marketCap || '0',
        uniqueHolders: coin.uniqueHolders || 0
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
        address: contractAddress,
        chain: 8453 // Base chain ID
      })
      
      const coin = response.data?.zora20Token
      if (!coin) return null

      return {
        totalVolume: coin.totalVolume || '0',
        volume24h: coin.volume24h || '0',
        price: coin.marketCap && coin.totalSupply ? 
          (Number(coin.marketCap) / Number(coin.totalSupply)).toString() : 
          '0',
        marketCap: coin.marketCap || '0'
      }
    } catch (error) {
      console.error('Failed to fetch trading info:', error)
      return null
    }
  },

  /**
   * Get transaction config for buying coins
   */
  getBuyConfig(contractAddress: `0x${string}`, amount: bigint, recipient: `0x${string}`): ZoraTradeConfig {
    return {
      direction: 'buy',
      target: contractAddress,
      args: {
        recipient,
        orderSize: amount, // For buys, this is ETH amount
        tradeReferrer: TRADE_REFERRER
      }
    }
  },

  /**
   * Get transaction config for selling coins
   */
  getSellConfig(contractAddress: `0x${string}`, amount: bigint, recipient: `0x${string}`): ZoraTradeConfig {
    return {
      direction: 'sell',
      target: contractAddress,
      args: {
        recipient,
        orderSize: amount, // For sells, this is token amount
        tradeReferrer: TRADE_REFERRER
      }
    }
  }
} 