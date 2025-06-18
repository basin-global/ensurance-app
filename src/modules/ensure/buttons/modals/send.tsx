'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import AccountImage from '@/modules/accounts/AccountImage'
import type { AccountSearchResult, ButtonContext, TokenType } from '../types'
import { handleAmountChange } from '../utils/input'
import { truncateAddress } from '../utils/input'
import { formatBalance } from '../utils/formatting'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  tokenType?: TokenType
  context: ButtonContext
  
  // Token balance
  tokenBalance: bigint
  
  // Account search
  accountSearchQuery: string
  accountSearchResults: AccountSearchResult[]
  isSearching: boolean
  onSearchQueryChange: (query: string) => void
  
  // Send operation
  onExecute: (amount: string, recipientAddress: string) => Promise<void>
  isLoading: boolean
  
  // Selected account
  selectedAccount?: AccountSearchResult
  onAccountSelect: (account: AccountSearchResult) => void
  recipientAddress?: string
}

export function SendModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  tokenType = 'erc20',
  context,
  tokenBalance,
  accountSearchQuery,
  accountSearchResults,
  isSearching,
  onSearchQueryChange,
  onExecute,
  isLoading,
  selectedAccount,
  onAccountSelect,
  recipientAddress
}: SendModalProps) {
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState('')

  // Helper function to get appropriate display name based on token type
  const getDisplayName = () => {
    if (tokenType === 'erc721' || tokenType === 'erc1155') {
      return tokenName || tokenSymbol
    }
    return tokenSymbol
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = tokenType === 'erc721' ? 0 : tokenType === 'erc1155' ? 0 : 18
    const result = handleAmountChange(value, tokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)
    
    // Validate amount against balance
    if (result.cleanValue && tokenBalance) {
      try {
        let inputAmount: bigint
        let currentBalance = tokenBalance
        
        if (tokenType === 'erc721') {
          inputAmount = BigInt(1)
        } else if (tokenType === 'erc1155') {
          inputAmount = BigInt(Math.floor(Number(result.cleanValue)))
        } else {
          // For ERC20 tokens, convert to wei
          const multiplier = Math.pow(10, 18)
          inputAmount = BigInt(Math.floor(Number(result.cleanValue) * multiplier))
        }
        
        if (inputAmount > currentBalance) {
          setAmountError('Amount exceeds available balance')
        } else {
          setAmountError('')
        }
      } catch (error) {
        setAmountError('Invalid amount')
      }
    } else {
      setAmountError('')
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setAmountError('')
    }
  }, [isOpen])

  // Handle account selection
  const handleAccountSelect = (account: AccountSearchResult) => {
    onAccountSelect(account)
    onSearchQueryChange(account.name)
  }

  const handleExecute = async () => {
    if (!recipientAddress || (!localAmount && tokenType !== 'erc721')) return
    
    const sendAmount = tokenType === 'erc721' ? '1' : localAmount
    
    try {
      await onExecute(sendAmount, recipientAddress)
      onClose()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const getDisplayAmount = () => {
    if (tokenType === 'erc721') return '1'
    return localFormattedAmount || '0'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                send
              </DialogTitle>
              <div className="text-3xl font-bold text-white">
                {getDisplayName()}
              </div>
              {tokenName && tokenName !== tokenSymbol && (
                <div className="text-sm text-gray-400">
                  {tokenName}
                </div>
              )}
            </div>
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt={tokenSymbol}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Recipient Search */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              recipient
            </label>
            <div className="relative">
              <Input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value)
                  if (selectedAccount) {
                    onAccountSelect(undefined as any) // Clear selection when typing
                  }
                }}
                placeholder="Search for an account..."
                className="w-full bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {accountSearchResults.length > 0 && !selectedAccount && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {accountSearchResults.map((result) => (
                    <button
                      key={result.name}
                      onClick={() => handleAccountSelect(result)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        <AccountImage
                          tokenId={result.token_id}
                          groupName={result.name.split('.')[1]}
                          variant="circle"
                          className="w-6 h-6"
                        />
                      </div>
                      <span className="font-mono">{result.name}</span>
                      {result.is_agent && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          agent
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedAccount && recipientAddress && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 space-y-1">
                  <div className="text-sm text-gray-400">
                    {selectedAccount.name}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {truncateAddress(recipientAddress)}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  <AccountImage
                    tokenId={selectedAccount.token_id}
                    groupName={selectedAccount.name.split('.')[1]}
                    variant="circle"
                    className="w-8 h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Amount Input (hide for ERC721) */}
          {tokenType !== 'erc721' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                amount
              </label>
              <Input
                type="text"
                value={localFormattedAmount}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="enter amount"
                className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                  amountError ? 'border-red-500' : ''
                }`}
              />
              {amountError && (
                <div className="text-sm text-red-500">
                  {amountError}
                </div>
              )}
              <div className="text-sm text-gray-400">
                balance: {formatBalance(tokenBalance.toString(), tokenType)} {getDisplayName()}
              </div>
            </div>
          )}

          {/* Send Summary */}
          {(recipientAddress && (localAmount || tokenType === 'erc721')) && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">You will send:</span>
                <span className="text-white">
                  {getDisplayAmount()} {getDisplayName()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={
              isLoading || 
              !recipientAddress || 
              (tokenType !== 'erc721' && (!localAmount || Number(localAmount) <= 0)) ||
              !!amountError
            }
            className="min-w-[120px] bg-amber-600 hover:bg-amber-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'SEND'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
