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
import { RefreshCw, ChevronDown, Loader2 } from 'lucide-react'
import type { ButtonContext, TokenInfo, TokenType } from '../types'
import { handleAmountChange } from '../utils/input'
import { formatBalance, formatNumber } from '../utils/formatting'
import { useDebounce } from '@/hooks/useDebounce'
import { usePrivy } from '@privy-io/react-auth'
import type { Address } from 'viem'

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  tokenType?: TokenType
  context: ButtonContext
  contractAddress: Address
  
  // Current token balance (what we're swapping FROM)
  tokenBalance: bigint
  
  // Available tokens to swap TO
  availableTokens: TokenInfo[]
  isLoadingTokens: boolean
  tokenImages: Record<string, string>
  
  // Quote data
  estimatedOutput: string
  isSimulating: boolean
  
  // Form handlers
  onTokenSelect: (token: TokenInfo) => void
  onExecute: (amount: string, selectedToken: TokenInfo) => Promise<void>
  
  // Form state
  selectedToken?: TokenInfo
  isLoading: boolean
}

export function SwapModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  tokenType = 'erc20',
  context,
  contractAddress,
  tokenBalance,
  availableTokens,
  isLoadingTokens,
  tokenImages,
  estimatedOutput,
  isSimulating,
  onTokenSelect,
  onExecute,
  selectedToken,
  isLoading
}: SwapModalProps) {
  const { user } = usePrivy()
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [localAmountError, setLocalAmountError] = useState('')
  const [showTokenSelect, setShowTokenSelect] = useState(false)
  const [localEstimatedOutput, setLocalEstimatedOutput] = useState('0')
  const [localIsSimulating, setLocalIsSimulating] = useState(false)
  
  const debouncedAmount = useDebounce(localAmount, 500)

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = tokenType === 'erc721' ? 0 : tokenType === 'erc1155' ? 0 : 18
    const result = handleAmountChange(value, tokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)
    
    // Validate amount against balance
    if (result.cleanValue && tokenBalance) {
      try {
        const multiplier = Math.pow(10, 18) // Our tokens are 18 decimals
        const inputAmount = BigInt(Math.floor(Number(result.cleanValue) * multiplier))
        
        if (inputAmount > tokenBalance) {
          setLocalAmountError('Amount exceeds available balance')
        } else {
          setLocalAmountError('')
        }
      } catch (error) {
        setLocalAmountError('Invalid amount')
      }
    } else {
      setLocalAmountError('')
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setLocalAmountError('')
      setShowTokenSelect(false)
      setLocalEstimatedOutput('0')
      setLocalIsSimulating(false)
    }
  }, [isOpen])

  // Get price quote for swap operation
  useEffect(() => {
    const getQuote = async () => {
      if (!selectedToken || 
          !debouncedAmount || 
          !user?.wallet?.address || 
          Number(debouncedAmount) <= 0) {
        setLocalEstimatedOutput('0')
        return
      }

      setLocalIsSimulating(true)
      try {
        // Convert amount based on our token's decimals (18)
        const rawAmount = Number(debouncedAmount.replace(/[^\d.]/g, ''))
        if (isNaN(rawAmount)) {
          setLocalEstimatedOutput('0')
          return
        }

        const multiplier = Math.pow(10, 18) // Our tokens are 18 decimals
        const sellAmountWei = BigInt(Math.floor(rawAmount * multiplier)).toString()

        // For swap: selling our token (contractAddress) to get selectedToken
        const params = new URLSearchParams({
          action: 'quote',
          sellToken: contractAddress,
          buyToken: selectedToken.address,
          sellAmount: sellAmountWei,
          taker: user.wallet.address,
          slippageBps: '200', // 2% slippage
          swapFeeBps: '100'   // 1% fee
        })

        const response = await fetch(`/api/0x?${params}`)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Quote error:', errorData)
          setLocalEstimatedOutput('0')
          return
        }
        
        const data = await response.json()
        
        if (!data.liquidityAvailable) {
          setLocalEstimatedOutput('0')
          return
        }
        
        if (data.buyAmount) {
          // Convert to proper decimal representation using selectedToken's decimals
          const amount = Number(data.buyAmount) / Math.pow(10, selectedToken.decimals)
          const formattedAmount = formatNumber(amount, selectedToken.decimals)
          setLocalEstimatedOutput(formattedAmount)
        } else {
          setLocalEstimatedOutput('0')
        }
      } catch (error) {
        console.error('Error getting quote:', error)
        setLocalEstimatedOutput('0')
      } finally {
        setLocalIsSimulating(false)
      }
    }

    getQuote()
  }, [debouncedAmount, selectedToken, user?.wallet?.address, contractAddress])

  const handleExecute = async () => {
    if (!localAmount || !selectedToken) return
    
    try {
      await onExecute(localAmount, selectedToken)
      onClose()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const handleTokenSelectClick = (token: TokenInfo) => {
    onTokenSelect(token)
    setShowTokenSelect(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                transform
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
                buy to transform
              </div>
              <p className="text-sm text-gray-400">
                You need tokens to transform them
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  quantity to transform
                </label>
                <Input
                  type="text"
                  value={localFormattedAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="enter amount"
                  className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                    localAmountError ? 'border-red-500' : ''
                  }`}
                />
                {localAmountError && (
                  <div className="text-sm text-red-500">
                    {localAmountError}
                  </div>
                )}
                <div className="text-sm text-gray-400">
                  balance: {formatBalance(tokenBalance.toString(), tokenType)}
                </div>
              </div>

              {/* Token Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  transform to
                </label>
                
                {isLoadingTokens ? (
                  <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading tokens...</span>
                  </div>
                ) : (
                  <>
                    {/* Selected Token Display */}
                    {selectedToken && !showTokenSelect ? (
                      <button
                        onClick={() => setShowTokenSelect(true)}
                        className="w-full flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image
                              src={tokenImages[selectedToken.address] || '/assets/no-image-found.png'}
                              alt={selectedToken.symbol}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-medium">{selectedToken.symbol}</div>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </button>
                    ) : (
                      // Token Selection List
                      <div className="relative">
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
                          {availableTokens.length === 0 ? (
                            <div className="text-center p-4 text-gray-400">
                              No tokens available for swapping
                            </div>
                          ) : (
                            availableTokens.map((token) => (
                              <button
                                key={token.address}
                                onClick={() => handleTokenSelectClick(token)}
                                className="w-full flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                              >
                                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                  <Image
                                    src={tokenImages[token.address] || '/assets/no-image-found.png'}
                                    alt={token.symbol}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-white font-medium">{token.symbol}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                        
                        {/* Scroll indicator fade */}
                        {availableTokens.length > 4 && (
                          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/95 to-transparent pointer-events-none rounded-b-lg" />
                        )}
                        
                        {/* Scroll hint text */}
                        {availableTokens.length > 4 && (
                          <div className="text-center mt-2">
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                              <ChevronDown className="w-3 h-3" />
                              scroll for more tokens
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Quote Display */}
              {selectedToken && localAmount && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">You will receive:</span>
                    <span className="text-white">
                      {localIsSimulating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>calculating...</span>
                        </div>
                      ) : (
                        `~${localEstimatedOutput} ${selectedToken.symbol}`
                      )}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                    <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <div className="text-blue-200 font-medium">currency exchange</div>
                      <div className="text-blue-300/80 text-xs mt-1">
                        Exchange {tokenSymbol} for {selectedToken.symbol} at current market rates with 2% slippage protection.
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
              !localAmount || 
              Number(localAmount) <= 0 ||
              !selectedToken ||
              !!localAmountError
            }
            className="min-w-[120px] bg-blue-600 hover:bg-blue-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'TRANSFORM'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
