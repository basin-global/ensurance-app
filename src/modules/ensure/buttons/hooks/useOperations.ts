import { useState, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { type Id } from 'react-toastify'
import type { 
  ButtonContext, 
  TokenInfo, 
  AccountSearchResult, 
  TokenType
} from '../types'
import { getTokenOperations } from '../operations'
import { executeOperation as executeAccountOperation } from '../accounts'
import {
  createTransactionToast,
  updateTransactionToast,
  successToast,
  errorToast,
  simpleErrorToast,
  permit2ApprovalToast,
  swapExecutionToast,
  stepTransactionToast
} from '../utils/notifications'

interface UseOperationsProps {
  context: ButtonContext
  contractAddress: string
  tokenId?: string
  tokenType?: TokenType
  tbaAddress?: string
  pricePerToken?: bigint
  primaryMintActive?: boolean
  tokenDecimals?: number
}

export const useOperations = ({
  context,
  contractAddress,
  tokenId,
  tokenType = 'erc20',
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  tokenDecimals = 18
}: UseOperationsProps) => {
  const { login, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isBurning, setIsBurning] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [currentToast, setCurrentToast] = useState<Id | null>(null)

  /**
   * Get the appropriate wallet provider
   */
  const getProvider = useCallback(async () => {
    if (!user?.wallet?.address) {
      throw new Error("Please connect your wallet first")
    }

    const connectedWallet = wallets.find(wallet => 
      wallet.address.toLowerCase() === user.wallet?.address?.toLowerCase()
    )
    
    if (!connectedWallet) {
      throw new Error("No connected wallet found")
    }

    await connectedWallet.switchChain(8453) // Base chain ID
    return await connectedWallet.getEthereumProvider()
  }, [user?.wallet?.address, wallets])

  /**
   * Execute buy operation
   */
  const executeBuy = useCallback(async (amount: string, selectedToken?: TokenInfo): Promise<void> => {
    if (!authenticated) {
      login()
      return
    }

    // For specific context, check if primary mint is active
    if (context === 'specific' && !primaryMintActive) {
      simpleErrorToast('This policy is no longer issuing certificates')
      return
    }

    setIsLoading(true)
    const toastId = createTransactionToast('buy')
    setCurrentToast(toastId)

    try {
      const toastContext = context === 'tokenbound' ? 'tokenbound' : 'regular'
      stepTransactionToast(toastId, 'setting up transaction', toastContext)

      // Debug log for tokenId
      console.log('🔍 Buy operation - tokenId:', tokenId, 'tokenType:', tokenType)

      // Build operation parameters
      const params = {
        contractAddress,
        tokenId: tokenId || '0', // Use '0' as fallback for non-ERC1155 tokens
        amount,
        selectedToken,
        userAddress: user!.wallet!.address!,
        pricePerToken,
        // For tokenbound, TBA should receive the proceeds
        sendTo: context === 'tokenbound' ? tbaAddress : user!.wallet!.address
      }

      // Build the transaction using operations layer
      // For ERC1155 tokens, always use erc1155 operations regardless of spending token
      // For other tokens, use operation type based on what we're spending
      const operationType = tokenType === 'erc1155' 
        ? 'erc1155'
        : selectedToken 
          ? (selectedToken.type === 'native' ? 'native' : 'erc20')
          : tokenType!
      
      const tokenOps = getTokenOperations(operationType)
      const operation = await tokenOps.buildBuyTransaction(params)

      // Check if we need approval and update toast accordingly
      if (operation.needsApproval && selectedToken) {
        permit2ApprovalToast(toastId, selectedToken.symbol, toastContext)
      } else {
        // Direct execution (no approval needed)
        const fromSymbol = selectedToken?.symbol || 'ETH'
        const toSymbol = 'TOKEN' // Generic target token name
        swapExecutionToast(toastId, fromSymbol, toSymbol, toastContext)
      }

      // Execute using accounts layer
      const provider = await getProvider()
      
      // Create status update function for tokenbound coordination
      const onStatusUpdate = (message: string) => {
        updateTransactionToast(toastId, message)
      }
      
      const executionParams = context === 'tokenbound' 
        ? { 
            userAddress: user!.wallet!.address!, 
            tbaAddress: tbaAddress!, 
            provider,
            toastId,
            onStatusUpdate
          }
        : { userAddress: user!.wallet!.address!, provider }

      const result = await executeAccountOperation(context, operation, executionParams)

      if (result.success) {
        successToast(toastId, 'buy', result.hash)
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (error: any) {
      console.error('Buy operation failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Buy cancelled')
      } else {
        errorToast(toastId, error, 'Buy failed')
      }
      throw error
    } finally {
      setIsLoading(false)
      setCurrentToast(null)
    }
  }, [
    authenticated, 
    login, 
    context, 
    primaryMintActive, 
    contractAddress, 
    tokenId, 
    tokenType, 
    tbaAddress, 
    pricePerToken, 
    user, 
    getProvider
  ])

  /**
   * Execute swap operation
   */
  const executeSwap = useCallback(async (amount: string, selectedToken: TokenInfo): Promise<void> => {
    if (!authenticated) {
      login()
      return
    }

    setIsSwapping(true)
    const toastId = createTransactionToast('swap')
    setCurrentToast(toastId)

    try {
      const toastContext = context === 'tokenbound' ? 'tokenbound' : 'regular'
      const fromSymbol = selectedToken.symbol
      const toSymbol = 'TOKEN'
      
      stepTransactionToast(toastId, 'setting up swap', toastContext)

      // Build operation parameters
      const params = {
        contractAddress,
        tokenId: tokenId || '',
        amount,
        selectedToken,
        userAddress: user!.wallet!.address!,
        // For tokenbound, TBA should receive the proceeds
        sendTo: context === 'tokenbound' ? tbaAddress : user!.wallet!.address
      }

      // Build the transaction using operations layer
      const tokenOps = getTokenOperations(tokenType!)
      const operation = await tokenOps.buildSwapTransaction(params)

      // Check if we need approval
      if (operation.needsApproval) {
        permit2ApprovalToast(toastId, fromSymbol, toastContext)
      } else {
        swapExecutionToast(toastId, fromSymbol, toSymbol, toastContext)
      }

      // Execute using accounts layer
      const provider = await getProvider()
      
      // Create status update function for tokenbound coordination
      const onStatusUpdate = (message: string) => {
        updateTransactionToast(toastId, message)
      }
      
      const executionParams = context === 'tokenbound' 
        ? { 
            userAddress: user!.wallet!.address!, 
            tbaAddress: tbaAddress!, 
            provider,
            toastId,
            onStatusUpdate
          }
        : { userAddress: user!.wallet!.address!, provider }

      const result = await executeAccountOperation(context, operation, executionParams)

      if (result.success) {
        successToast(toastId, 'swap', result.hash, selectedToken.symbol, toSymbol)
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (error: any) {
      console.error('Swap operation failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Swap cancelled')
      } else {
        errorToast(toastId, error, 'Swap failed')
      }
      throw error
    } finally {
      setIsSwapping(false)
      setCurrentToast(null)
    }
  }, [
    authenticated, 
    login, 
    contractAddress, 
    tokenId, 
    tokenType, 
    context, 
    tbaAddress, 
    user, 
    getProvider
  ])

  /**
   * Execute send operation
   */
  const executeSend = useCallback(async (amount: string, recipient: string): Promise<void> => {
    if (!authenticated) {
      login()
      return
    }

    setIsLoading(true)
    const toastId = createTransactionToast('send')
    setCurrentToast(toastId)

    try {
      updateTransactionToast(toastId, 'preparing transfer...')

      // Build operation parameters
      const params = {
        contractAddress,
        tokenId: tokenId || '',
        amount,
        recipient,
        userAddress: user!.wallet!.address!,
        tokenDecimals
      }

      // Build the transaction using operations layer
      const tokenOps = getTokenOperations(tokenType!)
      const operation = await tokenOps.buildSendTransaction(params)

      updateTransactionToast(toastId, 'executing transfer...')

      // Execute using accounts layer
      const provider = await getProvider()
      const executionParams = context === 'tokenbound' 
        ? { userAddress: user!.wallet!.address!, tbaAddress: tbaAddress!, provider }
        : { userAddress: user!.wallet!.address!, provider }

      const result = await executeAccountOperation(context, operation, executionParams)

      if (result.success) {
        successToast(toastId, 'send', result.hash)
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (error: any) {
      console.error('Send operation failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Send cancelled')
      } else {
        errorToast(toastId, error, 'Send failed')
      }
      throw error
    } finally {
      setIsLoading(false)
      setCurrentToast(null)
    }
  }, [
    authenticated, 
    login, 
    contractAddress, 
    tokenId, 
    tokenType, 
    context, 
    tbaAddress, 
    user, 
    getProvider,
    tokenDecimals
  ])

  /**
   * Execute burn operation
   */
  const executeBurn = useCallback(async (amount: string): Promise<void> => {
    if (!authenticated) {
      login()
      return
    }

    setIsBurning(true)
    const toastId = createTransactionToast('burn')
    setCurrentToast(toastId)

    try {
      updateTransactionToast(toastId, 'preparing burn...')

      // Build operation parameters
      const params = {
        contractAddress,
        tokenId: tokenId || '',
        amount,
        userAddress: user!.wallet!.address!,
        tokenDecimals
      }

      // Build the transaction using operations layer
      const tokenOps = getTokenOperations(tokenType!)
      const operation = await tokenOps.buildBurnTransaction(params)

      updateTransactionToast(toastId, 'executing burn...')

      // Execute using accounts layer
      const provider = await getProvider()
      const executionParams = context === 'tokenbound' 
        ? { userAddress: user!.wallet!.address!, tbaAddress: tbaAddress!, provider }
        : { userAddress: user!.wallet!.address!, provider }

      const result = await executeAccountOperation(context, operation, executionParams)

      if (result.success) {
        successToast(toastId, 'burn', result.hash)
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (error: any) {
      console.error('Burn operation failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Burn cancelled')
      } else {
        errorToast(toastId, error, 'Burn failed')
      }
      throw error
    } finally {
      setIsBurning(false)
      setCurrentToast(null)
    }
  }, [
    authenticated, 
    login, 
    contractAddress, 
    tokenId, 
    tokenType, 
    context, 
    tbaAddress, 
    user, 
    getProvider,
    tokenDecimals
  ])

  return {
    // Loading states
    isLoading,
    isBurning,
    isSwapping,
    
    // Operations
    executeBuy,
    executeSwap,
    executeSend,
    executeBurn,
    
    // Auth
    login,
    authenticated,
    userAddress: user?.wallet?.address
  }
} 