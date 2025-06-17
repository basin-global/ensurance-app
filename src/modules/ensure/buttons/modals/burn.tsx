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
import { Flame, ExternalLink } from 'lucide-react'
import type { ButtonContext, TokenType } from '../types'
import { handleAmountChange } from '../utils/input'
import { formatBalance } from '../utils/formatting'

interface BurnModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  tokenType?: TokenType
  context: ButtonContext
  
  // Token balance
  tokenBalance: bigint
  
  // Burn operation
  onExecute: (amount: string) => Promise<void>
  isLoading: boolean
}

export function BurnModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  tokenType = 'erc20',
  context,
  tokenBalance,
  onExecute,
  isLoading
}: BurnModalProps) {
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState('')

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

  const handleExecute = async () => {
    if (!localAmount && tokenType !== 'erc721') return
    
    const burnAmount = tokenType === 'erc721' ? '1' : localAmount
    
    try {
      await onExecute(burnAmount)
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
                burn
              </DialogTitle>
              <div className="text-3xl font-bold text-white">
                {tokenName || tokenSymbol}
              </div>
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
          {tokenBalance === BigInt(0) ? (
            // Show guidance when no balance
            <div className="space-y-6 text-center">
              <div className="text-lg text-gray-300">
                buy to burn
              </div>
              <p className="text-sm text-gray-400">
                You need {tokenSymbol} tokens to burn them
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Amount Input (hide for ERC721) */}
              {tokenType !== 'erc721' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    quantity to burn
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
                    balance: {formatBalance(tokenBalance.toString(), tokenType)} {tokenSymbol}
                  </div>
                </div>
              )}

              {/* Burn Summary */}
              {(localAmount || tokenType === 'erc721') && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">You will burn:</span>
                    <span className="text-white">
                      {getDisplayAmount()} {tokenSymbol}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 flex items-start gap-2 mt-3 p-3 bg-orange-500/10 rounded border border-orange-500/20">
                    <Flame className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-orange-200 font-medium">Permanent Action</div>
                      <div className="text-orange-300/80 text-xs mt-1">
                        Burned tokens are permanently removed from circulation and cannot be recovered. 
                        This reduces total supply, making remaining tokens more scarce and protecting their value.
                        {context === 'specific' && (
                          <>
                            {' '}Burning also creates{' '}
                            <a 
                              href="https://ensurance.app/proceeds/0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                            >
                              ensurance proceeds
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              tokenBalance === BigInt(0) ||
              (tokenType !== 'erc721' && (!localAmount || Number(localAmount) <= 0)) ||
              !!amountError
            }
            className="min-w-[120px] bg-orange-600 hover:bg-orange-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'BURN'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
