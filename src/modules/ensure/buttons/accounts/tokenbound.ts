import { 
  createWalletClient, 
  createPublicClient,
  custom, 
  http,
  type Address,
  maxUint256,
  encodeFunctionData
} from 'viem'
import { base } from 'viem/chains'
import { createTokenboundClient } from '@/config/tokenbound'
import { createTokenboundActions } from '@/lib/tokenbound'
import { handleTokenboundPermit2Approval } from '../utils/permit2'
import type { OperationResult } from '../operations'

/**
 * Tokenbound Account Operations
 * 
 * Handles execution through tokenbound SDK
 * All operations go through the TBA execute function
 * 
 * KEY INSIGHT FOR PERMIT2 + TBA:
 * 1. First, TBA approves tokens to Permit2 (standard ERC20 approval)
 * 2. Then, user signs EIP-712 message that has TBA as the token owner
 * 3. Finally, TBA executes the 0x transaction with the appended signature
 * 
 * This works because:
 * - The 0x API generates Permit2 message with TBA as `from` (token owner)
 * - User can sign this message on behalf of TBA (EIP-1271 compatible)
 * - TBA executes the transaction that validates the signature
 */

export interface TokenboundExecutionResult {
  success: boolean
  hash: string
  error?: string
}

export interface TokenboundExecutionParams {
  userAddress: string
  tbaAddress: string
  provider: any
  toastId?: any
  onStatusUpdate?: (message: string) => void
}

/**
 * Execute transaction through tokenbound account
 */
export const executeTransaction = async (
  operation: OperationResult,
  params: TokenboundExecutionParams
): Promise<TokenboundExecutionResult> => {
  const { userAddress, tbaAddress, provider, onStatusUpdate } = params

  try {
    // Create wallet client for the user (who controls the TBA)
    const walletClient = createWalletClient({
      account: userAddress as Address,
      chain: base,
      transport: custom(provider)
    })

    // Create tokenbound client
    const tokenboundClient = createTokenboundClient(walletClient)
    const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

    // 1. First check if TBA is deployed
    const isDeployed = await tokenboundClient.checkAccountDeployment({
      accountAddress: tbaAddress as `0x${string}`
    })

    if (!isDeployed) {
      throw new Error('Tokenbound account is not deployed. Please deploy it first.')
    }

    // 2. Special handling for ERC1155 operations (send/burn using safeTransferFrom)
    const PROCEEDS_ADDRESS = '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e'
    if (operation.transaction.to && 
        operation.transaction.data && 
        operation.transaction.data.includes('f242432a')) { // safeTransferFrom selector
      
      // Extract parameters from the transaction data
      // safeTransferFrom(address,address,uint256,uint256,bytes)
      // The data structure after the selector is: from(32) + to(32) + tokenId(32) + amount(32) + dataOffset(32)
      const txData = operation.transaction.data.slice(10) // Remove 0x and selector
      const toHex = txData.slice(64, 128) // Second parameter (to address)
      const tokenIdHex = txData.slice(128, 192) // Third parameter (tokenId)
      const amountHex = txData.slice(192, 256) // Fourth parameter (amount)
      
      const recipientAddress = '0x' + toHex.slice(24) // Remove leading zeros from address
      const tokenId = BigInt('0x' + tokenIdHex).toString()
      const amount = Number(BigInt('0x' + amountHex))
      
      const isBurn = recipientAddress.toLowerCase() === PROCEEDS_ADDRESS.toLowerCase()
      const operationType = isBurn ? 'burn' : 'send'
      
      console.log(`🔄 TBA: Detected ERC1155 ${operationType} operation - using transferNFT method`)
      onStatusUpdate?.(`${operationType === 'burn' ? 'burning' : 'sending'} tokens through your agent account...`)
      
      console.log(`🔄 TBA: ${operationType} details:`, {
        contractAddress: operation.transaction.to,
        tokenId,
        amount,
        recipient: recipientAddress
      })
      
      // Use transferNFT method for both ERC1155 send and burn
      const result = await tokenboundActions.transferNFT(
        {
          contract_address: operation.transaction.to,
          token_id: tokenId,
          contract: { type: 'ERC1155' },
          chain: 'base'
        } as any,
        recipientAddress as Address,
        amount
      )
      
      return {
        success: true,
        hash: result.hash
      }
    }

    let hash: string

    // Handle approval first if needed
    if (operation.needsApproval && operation.approvalData) {
      // For ERC1155 USDC approval through TBA
      if (operation.approvalData.to && operation.approvalData.data) {
        console.log('🔄 TBA: Executing approval transaction...')
        onStatusUpdate?.('executing approval through your agent account...')
        
        const approvalHash = await tokenboundClient.execute({
          account: tbaAddress as `0x${string}`,
          to: operation.approvalData.to as `0x${string}`,
          value: BigInt(0),
          data: operation.approvalData.data as `0x${string}`
        })

        // Wait for approval confirmation
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        await publicClient.waitForTransactionReceipt({ hash: approvalHash as `0x${string}` })
        
        // Add delay for network propagation
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      // For 0x operations with permit2, handle approval through TBA
      else if (operation.approvalData.permit2 || operation.approvalData.allowanceTarget) {
        console.log('🔄 TBA: Starting permit2 approval process...', {
          sellToken: operation.transaction.sellToken,
          sellAmount: operation.transaction.sellAmount,
          allowanceTarget: operation.approvalData.allowanceTarget,
          hasPermit2Data: !!operation.approvalData.permit2
        })
        
        const approvalResult = await handleTokenboundPermit2Approval({
          sellToken: operation.transaction.sellToken as Address,
          sellAmount: BigInt(operation.transaction.sellAmount),
          allowanceTarget: operation.approvalData.allowanceTarget as Address,
          userAddress: userAddress as Address,
          tbaAddress: tbaAddress as Address,
          tokenboundClient,
          provider,
          onStatus: (message: string) => {
            console.log(`🔄 TBA: ${message}`)
            onStatusUpdate?.(message)
          }
        })
        
        console.log('✅ TBA Permit2 approval completed:', {
          needsApproval: approvalResult.needsApproval,
          approvalHash: approvalResult.approvalHash,
          currentAllowance: approvalResult.currentAllowance.toString()
        })
      }
    }

    // 2. Execute 0x swap with Permit2 signature (if needed)
    if (operation.transaction.sellToken && operation.transaction.buyToken) {
      console.log('🔄 TBA: Processing 0x swap transaction...', {
        to: operation.transaction.to,
        value: operation.transaction.value,
        dataLength: operation.transaction.data?.length,
        hasPermit2: !!operation.approvalData?.permit2
      })
      
      let transactionData = operation.transaction.data as `0x${string}`
      
      // Check if we need to sign Permit2 EIP-712 message and append signature
      if (operation.approvalData?.permit2?.eip712) {
        console.log('🔄 TBA: Signing Permit2 EIP-712 message...')
        onStatusUpdate?.('signing permit2 message for your agent account...')
        
        try {
          // FIXED: For TBAs, the user (owner) signs the EIP-712 message
          // The message should already reference the TBA as the token owner
          const permitData = operation.approvalData.permit2.eip712
          
          // Ensure proper typing for EIP712 data
          const typedData = {
            types: permitData?.types || {},
            domain: permitData?.domain || {},
            primaryType: permitData?.primaryType || 'PermitTransferFrom',
            message: permitData?.message || {}
          }
          
          console.log('🔄 TBA: Signing permit2 with data:', {
            domain: typedData.domain,
            primaryType: typedData.primaryType,
            messageOwner: typedData.message.from || 'unknown',
            tbaAddress: tbaAddress,
            userAddress: userAddress,
            messageDetails: {
              token: typedData.message.permitted?.token,
              amount: typedData.message.permitted?.amount,
              spender: typedData.message.spender,
              nonce: typedData.message.nonce,
              deadline: typedData.message.deadline
            }
          })
          
          // Verify the permit message is for the TBA (security check)
          if (typedData.message.from && 
              typedData.message.from.toLowerCase() !== tbaAddress.toLowerCase()) {
            console.error('❌ TBA: Permit2 message mismatch!', {
              messageFrom: typedData.message.from,
              expectedTBA: tbaAddress
            })
            throw new Error(`Permit2 message owner mismatch. Expected ${tbaAddress}, got ${typedData.message.from}`)
          }
          
          // User signs the EIP-712 message on behalf of the TBA
          // This works because the permit message specifies the TBA as the token owner
          const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [
              userAddress,
              JSON.stringify(typedData)
            ]
          })
          
          console.log('✅ TBA: Permit2 signature obtained:', {
            signatureLength: signature.length,
            signature: signature.slice(0, 20) + '...',
            signedBy: userAddress,
            onBehalfOf: tbaAddress
          })
          
          // Append signature length and signature data to transaction
          // Following 0x documentation format: <transaction_data><signature_length><signature_data>
          const signatureBytes = signature.slice(2) // Remove 0x prefix
          const signatureLengthHex = (signatureBytes.length / 2).toString(16).padStart(64, '0') // 32-byte length
          
          transactionData = `${transactionData}${signatureLengthHex}${signatureBytes}` as `0x${string}`
          
          console.log('🔄 TBA: Appended Permit2 signature to transaction data')
        } catch (signError) {
          console.error('❌ TBA: Failed to sign Permit2 message:', signError)
          throw new Error(`Failed to sign Permit2 message: ${signError}`)
        }
      }
      
      // Update status for swap execution
      onStatusUpdate?.('executing swap through your agent account...')
      
      // Execute 0x transaction with Permit2 signature (if applicable)
      hash = await tokenboundClient.execute({
        account: tbaAddress as `0x${string}`,
        to: operation.transaction.to as `0x${string}`,
        value: operation.transaction.value ? BigInt(operation.transaction.value) : BigInt(0),
        data: transactionData
      })
    } else {
      // 3. Standard transaction through TBA
      console.log('🔄 TBA: Executing standard transaction...')
      onStatusUpdate?.('executing transaction through your agent account...')
      
      hash = await tokenboundClient.execute({
        account: tbaAddress as `0x${string}`,
        to: operation.transaction.to as `0x${string}`,
        value: operation.transaction.value ? BigInt(operation.transaction.value) : BigInt(0),
        data: (operation.transaction.data || '0x') as `0x${string}`
      })
    }

    return {
      success: true,
      hash
    }
  } catch (error: any) {
    console.error('Tokenbound execution failed:', error)
    return {
      success: false,
      hash: '',
      error: error.message || 'Transaction failed'
    }
  }
}

/**
 * Execute ETH transfer through tokenbound actions (legacy method)
 */
export const executeEthTransfer = async (
  amount: number,
  recipient: string,
  params: TokenboundExecutionParams
): Promise<TokenboundExecutionResult> => {
  const { userAddress, tbaAddress, provider } = params

  try {
    const walletClient = createWalletClient({
      account: userAddress as Address,
      chain: base,
      transport: custom(provider)
    })

    const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

    await tokenboundActions.transferETH({
      amount,
      recipientAddress: recipient as Address,
      chainId: base.id
    })

    return {
      success: true,
      hash: 'pending' // TokenboundActions doesn't return hash
    }
  } catch (error: any) {
    console.error('Tokenbound ETH transfer failed:', error)
    return {
      success: false,
      hash: '',
      error: error.message || 'Transfer failed'
    }
  }
}

/**
 * Execute ERC20 transfer through tokenbound actions (legacy method)
 */
export const executeErc20Transfer = async (
  amount: number,
  recipient: string,
  tokenAddress: string,
  params: TokenboundExecutionParams
): Promise<TokenboundExecutionResult> => {
  const { userAddress, tbaAddress, provider } = params

  try {
    const walletClient = createWalletClient({
      account: userAddress as Address,
      chain: base,
      transport: custom(provider)
    })

    const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

    await tokenboundActions.transferERC20({
      amount,
      recipientAddress: recipient as Address,
      erc20tokenAddress: tokenAddress as Address,
      erc20tokenDecimals: 18,
      chainId: base.id
    })

    return {
      success: true,
      hash: 'pending' // TokenboundActions doesn't return hash
    }
  } catch (error: any) {
    console.error('Tokenbound ERC20 transfer failed:', error)
    return {
      success: false,
      hash: '',
      error: error.message || 'Transfer failed'
    }
  }
}

/**
 * Execute NFT transfer through tokenbound actions (legacy method) 
 */
export const executeNftTransfer = async (
  tokenAddress: string,
  tokenId: string,
  recipient: string,
  tokenType: 'ERC721' | 'ERC1155',
  params: TokenboundExecutionParams,
  amount?: number
): Promise<TokenboundExecutionResult> => {
  const { userAddress, tbaAddress, provider } = params

  try {
    const walletClient = createWalletClient({
      account: userAddress as Address,
      chain: base,
      transport: custom(provider)
    })

    const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

    const result = await tokenboundActions.transferNFT(
      {
        contract_address: tokenAddress,
        token_id: tokenId,
        contract: { type: tokenType },
        chain: 'base'
      } as any,
      recipient as Address,
      amount
    )

    return {
      success: true,
      hash: result.hash
    }
  } catch (error: any) {
    console.error('Tokenbound NFT transfer failed:', error)
    return {
      success: false,
      hash: '',
      error: error.message || 'Transfer failed'
    }
  }
} 