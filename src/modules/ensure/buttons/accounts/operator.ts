import { 
  createWalletClient, 
  createPublicClient,
  custom, 
  http,
  type Address,
  maxUint256
} from 'viem'
import { base } from 'viem/chains'
import { executeSwap } from '@/modules/0x/executeSwap'
import { checkAndHandlePermit2Approval } from '../utils/permit2'
import type { OperationResult } from '../operations'

/**
 * Operator Account Operations
 * 
 * Handles execution through standard wallet client
 * Supports permit2 for ERC20 operations via 0x API
 */

export interface ExecutionResult {
  success: boolean
  hash: string
  error?: string
}

export interface ExecutionParams {
  userAddress: string
  provider: any
  walletClient?: any
}

/**
 * Execute transaction through standard wallet
 */
export const executeTransaction = async (
  operation: OperationResult,
  params: ExecutionParams
): Promise<ExecutionResult> => {
  const { userAddress, provider } = params

  try {
    // Create wallet client
    const walletClient = createWalletClient({
      account: userAddress as Address,
      chain: base,
      transport: custom(provider)
    })

    let hash: string

    // Handle approval first if needed
    if (operation.needsApproval && operation.approvalData) {
      // For ERC1155 USDC approval
      if (operation.approvalData.to && operation.approvalData.data) {
        const approvalHash = await walletClient.writeContract({
          address: operation.approvalData.to as Address,
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
          args: [operation.approvalData.spender, maxUint256],
          account: userAddress as Address
        })

        // Wait for approval
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        await publicClient.waitForTransactionReceipt({ hash: approvalHash })
      }
      
      // For 0x operations with permit2, let executeSwap handle approval
      else if (operation.approvalData.permit2 || operation.approvalData.allowanceTarget) {
        // This will be handled by executeSwap with proper permit2 flow
        console.log('Permit2 operation detected - executeSwap will handle approval')
      }
    }

    // Execute main transaction
    if (operation.transaction.sellToken && operation.transaction.buyToken) {
      // This is a 0x swap operation
      const result = await executeSwap({
        sellToken: operation.transaction.sellToken,
        buyToken: operation.transaction.buyToken,
        amount: operation.transaction.sellAmount,
        userAddress: userAddress as Address,
        provider,
        onStatus: (message: string) => {
          console.log(`🔄 ${message}`)
        }
      })

      if (!result.success || !result.txHash) {
        throw new Error('Swap execution failed')
      }

      hash = result.txHash
    } else {
      // Standard transaction - use sendTransaction for raw data
      hash = await walletClient.sendTransaction({
        to: operation.transaction.to as Address,
        data: operation.transaction.data as `0x${string}`,
        value: operation.transaction.value ? BigInt(operation.transaction.value) : BigInt(0),
        account: userAddress as Address
      })

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
    }

    return {
      success: true,
      hash
    }
  } catch (error: any) {
    console.error('Operator execution failed:', error)
    return {
      success: false,
      hash: '',
      error: error.message || 'Transaction failed'
    }
  }
}

/**
 * Check if user has sufficient balance for operation
 */
export const checkBalance = async (
  tokenAddress: string,
  userAddress: string,
  amount: bigint,
  isNative: boolean = false
): Promise<boolean> => {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    })

    let balance: bigint

    if (isNative) {
      balance = await publicClient.getBalance({
        address: userAddress as Address
      })
    } else {
      balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'balanceOf',
        args: [userAddress as Address]
      }) as bigint
    }

    return balance >= amount
  } catch (error) {
    console.error('Balance check failed:', error)
    return false
  }
} 