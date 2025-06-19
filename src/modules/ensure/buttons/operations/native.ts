import { parseEther, type Address } from 'viem'
import type { OperationResult, OperationParams } from './types'

/**
 * Native ETH Operations
 * 
 * Key features:
 * - Buy = Swap ETH for tokens (uses 0x API like ERC20)
 * - Send = Direct ETH transfer
 * - No burn operation for native ETH
 */

/**
 * Build a buy transaction - spend ETH to get tokens
 * This delegates to 0x API just like ERC20
 */
export const buildBuyTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, userAddress, sendTo } = params

  // Use sendTo for tokenbound context (TBA receives tokens), otherwise use userAddress
  const taker = sendTo || userAddress

  // Use 0x API to swap ETH for tokens
  const params0x = new URLSearchParams({
    action: 'quote',
    sellToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
    buyToken: contractAddress,
    sellAmount: parseEther(amount).toString(),
    taker,
    slippageBps: '200', // 2% slippage
    swapFeeBps: '100'   // 1% fee
  })

  const response = await fetch(`/api/0x?${params0x}`)
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`0x API error: ${errorData.message || 'Unknown error'}`)
  }
  
  const quoteData = await response.json()
  
  if (!quoteData.liquidityAvailable) {
    throw new Error('Insufficient liquidity for this trade')
  }

  return {
    transaction: quoteData.transaction,
    needsApproval: false // ETH doesn't need approval
  }
}

/**
 * Build a swap transaction - spend tokens to get ETH
 */
export const buildSwapTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, userAddress, sendTo } = params

  // Use sendTo for tokenbound context (TBA receives tokens), otherwise use userAddress
  const taker = sendTo || userAddress

  // Use 0x API to swap tokens for ETH
  const params0x = new URLSearchParams({
    action: 'quote',
    sellToken: contractAddress,
    buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
    sellAmount: parseEther(amount).toString(),
    taker,
    slippageBps: '200', // 2% slippage
    swapFeeBps: '100'   // 1% fee  
  })

  const response = await fetch(`/api/0x?${params0x}`)
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`0x API error: ${errorData.message || 'Unknown error'}`)
  }
  
  const quoteData = await response.json()
  
  if (!quoteData.liquidityAvailable) {
    throw new Error('Insufficient liquidity for this trade')
  }

  return {
    transaction: quoteData.transaction,
    needsApproval: false // This might need approval for the token being sold
  }
}

/**
 * Build a send transaction - transfer ETH
 */
export const buildSendTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { amount, recipient } = params
  
  if (!recipient) {
    throw new Error('Recipient required for ETH send')
  }

  const sendAmount = parseEther(amount)

  return {
    transaction: {
      to: recipient as Address,
      value: `0x${sendAmount.toString(16)}`,
      data: '0x'
    },
    needsApproval: false
  }
}

/**
 * Build a burn transaction - not applicable for native ETH
 */
export const buildBurnTransaction = async (params: OperationParams): Promise<OperationResult> => {
  throw new Error('Burn operation not applicable for native ETH')
} 