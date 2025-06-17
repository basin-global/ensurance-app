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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TokenInfo, ButtonContext } from '../types'
import { handleAmountChange } from '../utils/input'
import { formatNumber, getTokenDecimals } from '../utils/formatting'
import { getDefaultTokenImage } from '../utils/images'

interface BuyModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  context: ButtonContext
  availableTokens: TokenInfo[]
  isLoadingTokens: boolean
  tokenImages: Record<string, string>
  estimatedOutput: string
  isSimulating: boolean
  onAmountChange: (value: string) => void
  onTokenSelect: (token: TokenInfo) => void
  onExecute: (amount: string, selectedToken: TokenInfo) => Promise<void>
  selectedToken?: TokenInfo
  amount: string
  formattedAmount: string
  amountError?: string
  isLoading: boolean
}

export function BuyModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  context,
  availableTokens,
  isLoadingTokens,
  tokenImages,
  estimatedOutput,
  isSimulating,
  onAmountChange,
  onTokenSelect,
  onExecute,
  selectedToken,
  amount,
  formattedAmount,
  amountError,
  isLoading
}: BuyModalProps) {
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = selectedToken ? getTokenDecimals(selectedToken.symbol, selectedToken.decimals) : 18
    // Determine token type - ETH is native, others are ERC20
    const tokenType = selectedToken?.type === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, tokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)
    onAmountChange(result.cleanValue)
  }

  // Reset amount when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
    }
  }, [isOpen])

  const handleExecute = async () => {
    if (!selectedToken || !localAmount) return
    
    try {
      await onExecute(localAmount, selectedToken)
      onClose()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                ensure
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
          {/* Main content grid */}
          <div className="space-y-4">
            {/* Token Selection - MOVED TO TOP */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                PAY WITH
              </label>
              <Select
                value={selectedToken?.address}
                onValueChange={(value) => {
                  const token = availableTokens.find(t => t.address === value)
                  if (token) onTokenSelect(token)
                }}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-800 text-white h-12 text-lg font-medium">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  {isLoadingTokens ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    availableTokens.map((token) => (
                      <SelectItem
                        key={token.address}
                        value={token.address}
                        className="text-white hover:bg-gray-800 focus:bg-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                            {tokenImages[token.address] ? (
                              <Image
                                src={tokenImages[token.address]}
                                alt={token.symbol}
                                width={24}
                                height={24}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-700 rounded-full" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{token.symbol}</span>
                            {token.balance && (
                              <span className="text-xs text-gray-400">
                                Balance: {formatNumber(Number(token.balance) / Math.pow(10, token.decimals), token.decimals)}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input - MOVED BELOW TOKEN SELECTION WITH CLEARER LABEL */}
            {selectedToken && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  spend {selectedToken.symbol}
                </label>
                <Input
                  type="text"
                  value={localFormattedAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={`enter ${selectedToken.symbol} amount`}
                  className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                    amountError ? 'border-red-500' : ''
                  }`}
                />
                {amountError && (
                  <div className="text-sm text-red-500">
                    {amountError}
                  </div>
                )}
              </div>
            )}

            {/* Estimated Output - CLEARER WHEN TO SHOW */}
            {selectedToken && localAmount && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  ESTIMATED OUTPUT
                </label>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        <Image
                          src={imageUrl}
                          alt={tokenSymbol}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      </div>
                      <span className="text-lg font-medium">
                        {isSimulating ? (
                          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          estimatedOutput
                        )}
                      </span>
                    </div>
                    <span className="text-gray-400">{tokenSymbol}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
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
            disabled={isLoading || !selectedToken || !localAmount || Number(localAmount) <= 0}
            className="min-w-[120px] bg-green-600 hover:bg-green-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'ENSURE'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
