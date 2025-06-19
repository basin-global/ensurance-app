import { encodeFunctionData, type Address } from 'viem'
import { parseTokenAmount } from '../utils/input'
import type { OperationResult, OperationParams } from './types'

// Contract addresses for ERC1155 operations
const CONTRACTS = {
  usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as Address,
  erc20Minter: '0x777777e8850d8d6d98de2b5f64fae401f96eff31' as Address,
  mintReferral: '0x3CeDe7eae1feA81b4AEFf1f348f7497e6794ff96' as Address,
  proceeds: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e' as Address
} as const

// Zora ERC20 Minter ABI fragment
const ZORA_ERC20_MINTER_ABI = [
  {
    inputs: [
      { name: 'mintTo', type: 'address' },
      { name: 'quantity', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'totalValue', type: 'uint256' },
      { name: 'currency', type: 'address' },
      { name: 'mintReferral', type: 'address' },
      { name: 'comment', type: 'string' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const

// ERC1155 ABI fragment
const ERC1155_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

/**
 * ERC1155 Operations
 * 
 * Key features:
 * - Buy = Direct minting with USDC
 * - Requires USDC approval to minter contract
 * - Burn = Transfer to proceeds address
 */

export interface ERC1155Params extends OperationParams {
  tokenId: string
  pricePerToken?: bigint
  sendTo?: string
}

/**
 * Build a buy transaction - mint ERC1155 with USDC
 */
export const buildBuyTransaction = async (params: ERC1155Params): Promise<OperationResult> => {
  const { contractAddress, tokenId, amount, pricePerToken, userAddress, sendTo } = params
  
  if (!tokenId) {
    throw new Error('Token ID required for ERC1155 buy')
  }
  
  if (!pricePerToken) {
    throw new Error('Price per token required for ERC1155 buy')
  }

  const quantity = BigInt(Math.floor(Number(amount)))
  const totalPrice = pricePerToken * quantity
  const recipient = sendTo || userAddress

  // Build the mint transaction
  const data = encodeFunctionData({
    abi: ZORA_ERC20_MINTER_ABI,
    functionName: 'mint',
    args: [
      recipient as Address,           // recipient (maps to contract's mintTo param)
      quantity,                       // quantity
      contractAddress as Address,     // tokenAddress
      BigInt(tokenId),               // tokenId
      totalPrice,                    // totalValue
      CONTRACTS.usdc,                // currency
      CONTRACTS.mintReferral,        // mintReferral
      ''                             // comment
    ]
  })

  // Build USDC approval data
  const approvalData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    functionName: 'approve',
    args: [CONTRACTS.erc20Minter, totalPrice]
  })

  return {
    transaction: {
      to: CONTRACTS.erc20Minter,
      data,
      value: '0x0'
    },
    needsApproval: true,
    approvalData: {
      to: CONTRACTS.usdc,
      data: approvalData,
      value: '0x0'
    }
  }
}

/**
 * Build a swap transaction - not yet implemented for ERC1155
 */
export const buildSwapTransaction = async (params: ERC1155Params): Promise<OperationResult> => {
  throw new Error('ERC1155 swap not yet implemented')
}

/**
 * Build a send transaction - transfer ERC1155 tokens
 */
export const buildSendTransaction = async (params: ERC1155Params): Promise<OperationResult> => {
  const { contractAddress, tokenId, amount, recipient, userAddress } = params
  
  if (!tokenId) {
    throw new Error('Token ID required for ERC1155 send')
  }
  
  if (!recipient) {
    throw new Error('Recipient required for ERC1155 send')
  }

  const sendAmount = BigInt(Math.floor(Number(amount)))

  const data = encodeFunctionData({
    abi: ERC1155_ABI,
    functionName: 'safeTransferFrom',
    args: [
      userAddress as Address,
      recipient as Address,
      BigInt(tokenId),
      sendAmount,
      '0x' // No data needed
    ]
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
 * Build a burn transaction - transfer to proceeds address
 */
export const buildBurnTransaction = async (params: ERC1155Params): Promise<OperationResult> => {
  const { contractAddress, tokenId, amount, userAddress } = params
  
  if (!tokenId) {
    throw new Error('Token ID required for ERC1155 burn')
  }

  const burnAmount = BigInt(Math.floor(Number(amount)))

  const data = encodeFunctionData({
    abi: ERC1155_ABI,
    functionName: 'safeTransferFrom',
    args: [
      userAddress as Address,
      CONTRACTS.proceeds,
      BigInt(tokenId),
      burnAmount,
      '0x' // No data needed
    ]
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