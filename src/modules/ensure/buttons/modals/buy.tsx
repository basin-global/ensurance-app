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
  onExecute: (amount: string, selectedToken?: TokenInfo) => Promise<void>
  selectedToken?: TokenInfo
  amount: string
  formattedAmount: string
  amountError?: string
  isLoading: boolean
  // ERC1155 specific props
  pricePerToken?: bigint
  usdcBalance?: bigint
  totalPrice?: bigint
  // Wallet info for debugging
  userAddress?: string
  authenticated?: boolean
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
  isLoading,
  // ERC1155 specific props
  pricePerToken,
  usdcBalance,
  totalPrice,
  // Wallet info for debugging
  userAddress,
  authenticated
}: BuyModalProps) {
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [localAmountError, setLocalAmountError] = useState('')

  // Helper function to get appropriate display name based on token type
  const getDisplayName = () => {
    // For buy modal, we're always dealing with the target token
    // context === 'specific' means ERC1155, otherwise use symbol
    if (context === 'specific') {
      return tokenName || tokenSymbol
    }
    return tokenSymbol
  }

  // Show placeholder for tokenbound context
  if (context === 'tokenbound') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  ensure
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {getDisplayName()}
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

          <div className="py-8 text-center space-y-4">
            <div className="text-6xl">💰</div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                Coming Soon
              </h3>
              <p className="text-gray-400 text-sm">
                Buy operations for tokenbound accounts will be available soon.
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-6 border-t border-gray-800">
            <Button 
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Helper function for button validation
  const isButtonDisabled = () => {
    if (isLoading || !localAmount || Number(localAmount) <= 0) return true
    if (context !== 'specific' && !selectedToken) return true
    
    // For ERC1155, check if there's a validation error
    if (context === 'specific') {
      return !!localAmountError
    }
    
    // For general context, check amount error
    return !!amountError
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = selectedToken ? getTokenDecimals(selectedToken.symbol, selectedToken.decimals) : 18
    // Determine token type - ETH is native, others are ERC20
    const tokenType = selectedToken?.type === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, tokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)
    onAmountChange(result.cleanValue)

    // For ERC1155 context, validate against USDC balance instead of selectedToken
    if (context === 'specific' && result.cleanValue && pricePerToken && usdcBalance) {
      const quantity = BigInt(Math.floor(Number(result.cleanValue)))
      const totalCost = quantity * pricePerToken
      
      if (totalCost > usdcBalance) {
        setLocalAmountError('Insufficient USDC balance')
      } else {
        setLocalAmountError('')
      }
    }
  }

  // Reset amount when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setLocalAmountError('')
      
      // Debug logging for ERC1155 context
      if (context === 'specific') {
        console.log('🔍 BuyModal opened for ERC1155:', {
          context,
          walletAddress: userAddress || 'NOT_CONNECTED',
          authenticated: authenticated,
          usdcBalance: usdcBalance?.toString(),
          usdcBalanceFormatted: usdcBalance ? (Number(usdcBalance) / 1_000_000).toFixed(6) : 'undefined',
          pricePerToken: pricePerToken?.toString(),
          pricePerTokenFormatted: pricePerToken ? (Number(pricePerToken) / 1_000_000).toFixed(2) : 'undefined',
          totalPrice: totalPrice?.toString(),
          localAmount,
          calculatedTotal: pricePerToken && localAmount ? 
            (Number(BigInt(Math.floor(Number(localAmount))) * pricePerToken) / 1_000_000).toFixed(2) : 'N/A'
        })
      }
    }
  }, [isOpen, context, usdcBalance, pricePerToken, totalPrice])

  const handleExecute = async () => {
    // For specific context (ERC1155), selectedToken is optional
    if (context === 'specific') {
      if (!localAmount) return
      try {
        await onExecute(localAmount)
        onClose()
      } catch (error) {
        // Error handling is done in the hook
      }
    } else {
      if (!selectedToken || !localAmount) return
      try {
        await onExecute(localAmount, selectedToken)
        onClose()
      } catch (error) {
        // Error handling is done in the hook
      }
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
                {getDisplayName()}
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
            {/* ERC1155 Specific: Show USDC payment info */}
            {context === 'specific' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  PAY WITH USDC
                </label>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  {/* Price Display - Prominent */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">$</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-bold text-white">
                        {pricePerToken ? (Number(pricePerToken) / 1_000_000).toFixed(2) : '0.00'}
                      </div>
                      <div className="text-sm text-gray-400">USDC per certificate</div>
                    </div>
                  </div>
                  
                  {/* Balance Info - Muted below */}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      Your balance: {usdcBalance ? formatNumber(Number(usdcBalance) / 1_000_000, 2) : '0.00'} USDC
                      {(!usdcBalance || Number(usdcBalance) === 0) && (
                        <div className="text-xs text-amber-400 mt-1">
                          💡 You need USDC on Base network to purchase certificates
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* General/Tokenbound: Token Selection */
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
            )}

            {/* Amount Input */}
            {(context === 'specific' || selectedToken) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {context === 'specific' ? 
                    `certificates to purchase` : 
                    `spend ${selectedToken?.symbol}`
                  }
                </label>
                <Input
                  type="text"
                  value={localFormattedAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={context === 'specific' ? 
                    'enter certificate quantity' : 
                    `enter ${selectedToken?.symbol} amount`
                  }
                  className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                    (context === 'specific' ? localAmountError : amountError) ? 'border-red-500' : ''
                  }`}
                />
                {(context === 'specific' ? localAmountError : amountError) && (
                  <div className="text-sm text-red-500">
                    {context === 'specific' ? localAmountError : amountError}
                  </div>
                )}
              </div>
            )}

            {/* Output Display */}
            {(context === 'specific' ? localAmount : (selectedToken && localAmount)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {context === 'specific' ? 'TOTAL COST' : 'ESTIMATED OUTPUT'}
                </label>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        {context === 'specific' ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">$</span>
                          </div>
                        ) : (
                          <Image
                            src={imageUrl}
                            alt={tokenSymbol}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-lg font-medium">
                        {context === 'specific' ? (
                          pricePerToken && localAmount ? 
                            formatNumber(Number(BigInt(Math.floor(Number(localAmount))) * pricePerToken) / 1_000_000, 2) : 
                            '0.00'
                        ) : (
                          isSimulating ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            estimatedOutput
                          )
                        )}
                      </span>
                    </div>
                    <span className="text-gray-400">
                      {context === 'specific' ? 'USDC' : getDisplayName()}
                    </span>
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
            disabled={isButtonDisabled()}
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
