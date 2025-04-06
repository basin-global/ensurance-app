export interface CoinDetails {
  name: string
  symbol: string
  totalSupply: string
  totalVolume: string
  volume24h: string
  createdAt: string
  creatorAddress: `0x${string}`
  description?: string
  price?: string
  marketCap?: string
  uniqueHolders?: number
}

export interface TradingInfo {
  totalVolume: string
  volume24h: string
  price: string
  marketCap: string
}

// Zora SDK Types
export interface ZoraTradeArgs {
  recipient: `0x${string}`
  orderSize: bigint
  minAmountOut?: bigint
  sqrtPriceLimitX96?: bigint
  tradeReferrer?: `0x${string}`
}

export interface ZoraTradeConfig {
  direction: 'buy' | 'sell'
  target: `0x${string}`
  args: ZoraTradeArgs
}

// Service Types
export interface TradeConfig {
  address: `0x${string}`
  abi: any
  functionName: string
  args: unknown[]
  value?: bigint
  chain: {
    id: number
    name: string
  }
} 