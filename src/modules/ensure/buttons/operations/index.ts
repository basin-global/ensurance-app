import { TokenType } from '../types'
import * as nativeOps from './native'
import * as erc20Ops from './erc20'
import * as erc721Ops from './erc721'
import * as erc1155Ops from './erc1155'
import type { OperationResult, OperationParams } from './types'

// Re-export types
export type { OperationResult, OperationParams } from './types'

/**
 * Route operations to the appropriate token type handler
 */
export const getTokenOperations = (tokenType: TokenType) => {
  switch (tokenType) {
    case 'native':
      return nativeOps
    case 'erc20':
      return erc20Ops
    case 'erc721':
      return erc721Ops
    case 'erc1155':
      return erc1155Ops
    default:
      throw new Error(`Unsupported token type: ${tokenType}`)
  }
}

/**
 * Universal operation router
 * Note: This is a convenience function for future use
 */
export const executeOperation = async (
  operation: 'buy' | 'sell' | 'send' | 'burn',
  tokenType: TokenType,
  params: OperationParams
): Promise<OperationResult> => {
  const ops = getTokenOperations(tokenType)
  
  // Type assertions for token-specific requirements
  if ((tokenType === 'erc721' || tokenType === 'erc1155') && !params.tokenId) {
    throw new Error(`Token ID required for ${tokenType} operations`)
  }
  
  switch (operation) {
    case 'buy':
      return await ops.buildBuyTransaction(params as any)
    case 'sell':
      return await ops.buildSwapTransaction(params as any)
    case 'send':
      return await ops.buildSendTransaction(params as any)
    case 'burn':
      return await ops.buildBurnTransaction(params as any)
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}

// Direct exports for convenience
export const native = nativeOps
export const erc20 = erc20Ops
export const erc721 = erc721Ops
export const erc1155 = erc1155Ops 