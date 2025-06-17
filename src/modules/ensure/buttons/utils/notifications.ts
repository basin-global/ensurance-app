import { toast, type Id } from 'react-toastify'
import React from 'react'
import type { OperationType } from '../types'

/**
 * Create initial transaction toast
 */
export const createTransactionToast = (operation: OperationType): Id => {
  return toast.loading('setting everything up...')
}

/**
 * Update transaction toast with new message
 */
export const updateTransactionToast = (
  toastId: Id, 
  message: string, 
  type: 'info' | 'success' | 'error' = 'info'
): void => {
  toast.update(toastId, {
    render: message,
    type,
    isLoading: type === 'info'
  })
}

/**
 * Success toast with transaction link
 */
export const successToast = (
  toastId: Id, 
  operation: OperationType, 
  txHash: string, 
  fromSymbol?: string, 
  toSymbol?: string
): void => {
  const message = getSuccessMessage(operation, fromSymbol, toSymbol)
  
  // Create React element with clickable link
  const ToastContent = React.createElement(
    'div',
    {},
    React.createElement('div', {}, message),
    React.createElement(
      'a',
      {
        href: `https://basescan.org/tx/${txHash}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-sm text-blue-400 hover:text-blue-300 underline mt-1 block'
      },
      'View transaction'
    )
  )
  
  toast.update(toastId, {
    render: ToastContent,
    type: 'success',
    isLoading: false,
    autoClose: 5000
  })
}

/**
 * Error toast with user-friendly messages
 */
export const errorToast = (
  toastId: Id, 
  error: any, 
  defaultMessage: string = 'Transaction failed'
): void => {
  let userMessage = defaultMessage
  
  if (error?.code === 4001 || error?.message?.includes('rejected')) {
    userMessage = 'Transaction cancelled'
  } else if (error?.message?.includes('failed on-chain')) {
    userMessage = 'Transaction failed on-chain. This may be due to slippage or contract issues.'
  } else if (error?.message?.includes('insufficient funds')) {
    userMessage = 'Insufficient funds to complete this transaction'
  } else if (error?.message?.includes('gas')) {
    userMessage = 'Transaction failed due to gas estimation issues'
  } else if (error?.message) {
    userMessage = error.message
  }
  
  toast.update(toastId, {
    render: userMessage,
    type: 'error',
    isLoading: false,
    autoClose: 5000
  })
}

/**
 * Simple error toast (not updating existing)
 */
export const simpleErrorToast = (message: string): void => {
  toast.error(message)
}

/**
 * Simple success toast (not updating existing)
 */
export const simpleSuccessToast = (message: string): void => {
  toast.success(message)
}

/**
 * Get success message based on operation type
 */
const getSuccessMessage = (
  operation: OperationType, 
  fromSymbol?: string, 
  toSymbol?: string
): string => {
  switch (operation) {
    case 'buy':
      return 'success! you have ensured what matters'
    case 'swap':
      return `success! ${fromSymbol || 'tokens'} transformed to ${toSymbol || 'tokens'}`
    case 'send':
      return 'transfer successful!'
    case 'burn':
      return 'tokens burned successfully'
    default:
      return 'transaction successful!'
  }
}

/**
 * Handle approval-related toasts
 */
export const approvalToast = (toastId: Id, tokenSymbol: string): void => {
  toast.update(toastId, {
    render: `${tokenSymbol} approved! Click ENSURE again to complete purchase.`,
    type: 'success',
    isLoading: false,
    autoClose: 5000
  })
}
