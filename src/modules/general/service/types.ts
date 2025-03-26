export interface CoinDetails {
  name: string
  symbol: string
  totalSupply: string
  totalVolume: string
  volume24h: string
  createdAt: string
  creatorAddress: `0x${string}`
  description?: string
}

export interface TradingInfo {
  totalVolume: string
  volume24h: string
  price: string
} 