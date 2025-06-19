import * as operator from './operator'
import * as tokenbound from './tokenbound'
import { ButtonContext } from '../types'

/**
 * Account Execution Factory
 * 
 * Routes execution to the appropriate account type
 */

export type AccountExecutionResult = {
  success: boolean
  hash: string
  error?: string
}

/**
 * Execute operation based on context
 */
export const executeOperation = async (
  context: ButtonContext,
  operation: any,
  params: any
): Promise<AccountExecutionResult> => {
  if (context === 'tokenbound') {
    return await tokenbound.executeTransaction(operation, params)
  } else {
    // operator, general, specific contexts use standard wallet
    return await operator.executeTransaction(operation, params)
  }
}

// Re-export for direct access
export { operator, tokenbound } 