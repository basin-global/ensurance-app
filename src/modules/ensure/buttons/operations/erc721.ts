import { encodeFunctionData, type Address } from 'viem'
import type { OperationResult, OperationParams } from './types'

/**
 * ERC721 Operations
 * 
 * Key features:
 * - No buy operation (NFTs aren't typically bought via DEX)
 * - Send = safeTransferFrom
 * - No burn operation (transfer to burn address if needed)
 */

export interface ERC721Params extends OperationParams {
  tokenId: string
}

// ERC721 ABI fragment
const ERC721_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

/**
 * Build a buy transaction - not typically supported for NFTs
 */
export const buildBuyTransaction = async (params: ERC721Params): Promise<OperationResult> => {
  throw new Error('Buy operation not supported for ERC721 tokens. Use marketplace instead.')
}

/**
 * Build a swap transaction - not typically supported for NFTs
 */
export const buildSwapTransaction = async (params: ERC721Params): Promise<OperationResult> => {
  throw new Error('Swap operation not supported for ERC721 tokens. Use marketplace instead.')
}

/**
 * Build a send transaction - transfer NFT
 */
export const buildSendTransaction = async (params: ERC721Params): Promise<OperationResult> => {
  const { contractAddress, tokenId, recipient, userAddress } = params
  
  if (!tokenId) {
    throw new Error('Token ID required for ERC721 send')
  }
  
  if (!recipient) {
    throw new Error('Recipient required for ERC721 send')
  }

  const data = encodeFunctionData({
    abi: ERC721_ABI,
    functionName: 'safeTransferFrom',
    args: [
      userAddress as Address,
      recipient as Address,
      BigInt(tokenId)
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
 * Build a burn transaction - transfer to burn address
 */
export const buildBurnTransaction = async (params: ERC721Params): Promise<OperationResult> => {
  const { contractAddress, tokenId, userAddress } = params
  
  if (!tokenId) {
    throw new Error('Token ID required for ERC721 burn')
  }

  // Transfer to null address (burn)
  const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as Address

  const data = encodeFunctionData({
    abi: ERC721_ABI,
    functionName: 'safeTransferFrom',
    args: [
      userAddress as Address,
      BURN_ADDRESS,
      BigInt(tokenId)
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