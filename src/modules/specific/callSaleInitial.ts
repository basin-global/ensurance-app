import { CONTRACTS, ABIS } from './config'
import { encodeSalesConfig } from './callSale'
import type { SalesConfig } from './types'

export const getInitialSalesConfig = (tokenId: string, walletAddress: `0x${string}`): SalesConfig => {
  // Get current timestamp in seconds
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
  
  return {
    saleStart: currentTimestamp,
    saleEnd: BigInt(0),
    maxTokensPerAddress: BigInt(0),
    pricePerToken: BigInt(1e6), // 1 USDC (6 decimals)
    fundsRecipient: walletAddress,
    currency: CONTRACTS.usdc
  }
}

export const encodeInitialSalesConfig = (tokenId: string, walletAddress: `0x${string}`) => {
  const config = getInitialSalesConfig(tokenId, walletAddress)
  return encodeSalesConfig(config, tokenId)
} 