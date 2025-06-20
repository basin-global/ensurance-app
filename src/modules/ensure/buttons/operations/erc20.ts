import { encodeFunctionData, type Address } from 'viem'
import { parseTokenAmount } from '../utils/input'
import type { OperationResult, OperationParams } from './types'

/**
 * ERC20 Operations
 * 
 * Key insight: Buy and Swap are the same operation - both use 0x API
 * The only difference is the direction of the trade
 */

/**
 * Build a buy transaction - spend selectedToken to get contractAddress token
 * Uses 0x API with permit2
 */
export const buildBuyTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, selectedToken, userAddress, sendTo } = params
  
  if (!selectedToken) {
    throw new Error('Selected token required for ERC20 buy')
  }

  const sellToken = selectedToken.address // Token we're spending
  const buyToken = contractAddress // Token we're buying
  
  // Determine the correct token type for parsing the sell amount
  const isSellingEth = sellToken.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
  const sellTokenType = isSellingEth ? 'native' : 'erc20'
  const sellAmount = parseTokenAmount(amount, sellTokenType, selectedToken.decimals).toString()

  // Get quote from 0x API
  // Use sendTo for tokenbound context (TBA receives tokens), otherwise use userAddress
  const taker = sendTo || userAddress
  
  const params0x = new URLSearchParams({
    action: 'quote',
    sellToken,
    buyToken,
    sellAmount,
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

  // Check if we need approval (all ERC20 tokens need approval for permit2)
  const needsApproval = !isSellingEth && (quoteData.permit2 || quoteData.allowanceTarget)

  return {
    transaction: {
      ...quoteData.transaction,
      sellToken,
      buyToken,
      sellAmount
    },
    needsApproval,
    approvalData: {
      permit2: quoteData.permit2,
      allowanceTarget: quoteData.allowanceTarget
    }
  }
}

/**
 * Build a swap transaction - spend contractAddress token to get selectedToken
 * This is just buy in reverse direction!
 */
export const buildSwapTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, selectedToken, userAddress, sendTo } = params
  
  if (!selectedToken) {
    throw new Error('Selected token required for ERC20 swap')
  }

  // Swap is just buy with reversed tokens
  const swapParams = {
    ...params,
    contractAddress: selectedToken.address, // Now we're buying the selected token
    selectedToken: {
      ...selectedToken,
      address: contractAddress, // And selling the original contract token
      decimals: 18 // Our tokens are 18 decimals
    },
    sendTo // Ensure sendTo is passed through for tokenbound context
  }

  return await buildBuyTransaction(swapParams)
}

/**
 * Build a send transaction - transfer ERC20 tokens
 */
export const buildSendTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, recipient, tokenDecimals = 18 } = params
  
  if (!recipient) {
    throw new Error('Recipient required for ERC20 send')
  }

  const sendAmount = parseTokenAmount(amount, 'erc20', tokenDecimals)

  // ERC20 transfer function call
  const data = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        name: 'transfer',
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    functionName: 'transfer',
    args: [recipient as Address, sendAmount]
  })

  return {
    transaction: {
      to: contractAddress,
      data,
      value: '0x0'
    },
    needsApproval: false
  }
}

/**
 * Build a burn transaction - burn ERC20 tokens
 */
export const buildBurnTransaction = async (params: OperationParams): Promise<OperationResult> => {
  const { contractAddress, amount, tokenDecimals = 18 } = params
  
  const burnAmount = parseTokenAmount(amount, 'erc20', tokenDecimals)

  // ERC20 burn function call
  const data = encodeFunctionData({
    abi: [
      {
        inputs: [{ name: 'amount', type: 'uint256' }],
        name: 'burn',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    functionName: 'burn',
    args: [burnAmount]
  })

  return {
    transaction: {
      to: contractAddress,
      data,
      value: '0x0'
    },
    needsApproval: false
  }
} 