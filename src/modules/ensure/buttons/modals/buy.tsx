'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
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
import type { TokenInfo, ButtonContext, TokenType } from '../types'
import { handleAmountChange } from '../utils/input'
import { formatNumber, getTokenDecimals } from '../utils/formatting'
import { useTokenData } from '../hooks/useTokenData'
import { useOperations } from '../hooks/useOperations'

interface BuyModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  context: ButtonContext
  tokenType?: TokenType
  contractAddress: string
  tbaAddress?: string
  pricePerToken?: bigint
  primaryMintActive?: boolean
  onRefreshBalance?: () => void
}

export function BuyModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  context,
  tokenType = 'erc20',
  contractAddress,
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  onRefreshBalance
}: BuyModalProps) {
  // Modal state - kept local as decided
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [localAmountError, setLocalAmountError] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  
  // Debounce amount for quote fetching to prevent excessive API calls and rounding errors
  const debouncedAmount = useDebounce(localAmount, 500) // 500ms delay
  
  // Target token info removed - now using passed props directly

  // Use new simplified hooks
  const {
    availableTokens,
    isLoadingTokens,
    tokenImages,
    estimatedOutput,
    isSimulating,
    erc1155Balance,
    fetchAvailableTokens,
    fetchQuote
  } = useTokenData({
    context,
    contractAddress: contractAddress as any,
    tokenType,
    tbaAddress: tbaAddress as any
  })

  const {
    isLoading,
    executeBuy,
    authenticated,
    login
  } = useOperations({
    context,
    contractAddress,
    tokenType,
    tbaAddress,
    pricePerToken,
    primaryMintActive
  })

  // Helper functions
  const getDisplayName = () => {
    // Use the passed tokenName/tokenSymbol props since they're already properly set
    // from the parent component
    return tokenName || tokenSymbol
  }

  const getImageUrl = () => {
    // Always use the passed imageUrl prop since it's already properly processed
    // from the parent component (Details) which handles metadata fetching and IPFS conversion
    return imageUrl
  }

  const isButtonDisabled = () => {
    if (isLoading || !localAmount || Number(localAmount) <= 0) return true
    
    if ((tokenType as string) === 'erc1155') {
      return !!localAmountError
    }
    
    if (!selectedToken) return true
    return !!localAmountError
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = selectedToken ? getTokenDecimals(selectedToken.symbol, selectedToken.decimals) : 18
    const inputTokenType = selectedToken?.type === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, inputTokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)

    // Validate based on token type
    if ((tokenType as string) === 'erc1155') {
      // For ERC1155 tokens, validate against USDC balance
      if (result.cleanValue && pricePerToken && erc1155Balance.usdcBalance) {
        const quantity = BigInt(Math.floor(Number(result.cleanValue)))
        const totalCost = quantity * pricePerToken
        
        if (totalCost > erc1155Balance.usdcBalance) {
          setLocalAmountError('Insufficient USDC balance')
        } else {
          setLocalAmountError('')
        }
      } else {
        setLocalAmountError('')
      }
    } else {
      // For ERC20/native tokens, validate against selected token balance
      if (result.cleanValue && selectedToken?.balance) {
        const inputAmount = Number(result.cleanValue)
        const availableBalance = Number(selectedToken.balance) / Math.pow(10, selectedToken.decimals)
        
        if (inputAmount > availableBalance) {
          setLocalAmountError(`Insufficient ${selectedToken.symbol} balance`)
        } else {
          setLocalAmountError('')
        }
      } else {
        setLocalAmountError('')
      }
    }

    // Note: Quote fetching is now handled by debouncedAmount effect below
  }

  // Target token info fetching removed - now using passed props directly

  // Reset and load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setLocalAmountError('')
      setSelectedToken(null)
      
      if (authenticated) {
        fetchAvailableTokens('buy')
      }
    }
  }, [isOpen, authenticated, fetchAvailableTokens])

  // Set initial selected token when available tokens load
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      const ethToken = availableTokens.find(t => t.type === 'native')
      if (ethToken) {
        setSelectedToken(ethToken)
      }
    }
  }, [availableTokens, selectedToken])

  // Clear estimate immediately when user starts typing (prevents stale estimates)
  useEffect(() => {
    if (localAmount !== debouncedAmount && (tokenType as string) !== 'erc1155') {
      // User is typing but debounced value hasn't updated yet - clear stale estimate
      fetchQuote('', '', '0') // This will set estimatedOutput to '0'
    }
  }, [localAmount, debouncedAmount, tokenType, fetchQuote])

  // Fetch quote when debounced amount changes (prevents excessive API calls and rounding errors)
  useEffect(() => {
    if (selectedToken && debouncedAmount && (tokenType as string) !== 'erc1155') {
      const sellAmount = (Number(debouncedAmount) * Math.pow(10, selectedToken.decimals)).toString()
      fetchQuote(selectedToken.address, contractAddress, sellAmount)
    }
  }, [debouncedAmount, selectedToken, contractAddress, tokenType, fetchQuote])

  const handleExecute = async () => {
    if (!authenticated) {
      login()
      return
    }

    try {
      if ((tokenType as string) === 'erc1155') {
        await executeBuy(localAmount)
      } else {
        if (!selectedToken) return
        await executeBuy(localAmount, selectedToken)
      }
      
      // Refresh balance and close modal
      onRefreshBalance?.()
      onClose()
    } catch (error) {
      // Error handling is done in the useOperations hook
      console.error('Buy execution error:', error)
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
                src={getImageUrl()}
                alt={getDisplayName()}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-4">
            {/* ERC1155: Show USDC payment info */}
            {(tokenType as string) === 'erc1155' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  PAY WITH USDC
                </label>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
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
                  
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      Your balance: {erc1155Balance ? formatNumber(Number(erc1155Balance.usdcBalance) / 1_000_000, 2) : '0.00'} USDC
                      {(!erc1155Balance.usdcBalance || Number(erc1155Balance.usdcBalance) === 0) && (
                        <div className="text-xs text-amber-400 mt-1">
                          💡 You need USDC on Base network to purchase certificates
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ERC20/Native: Token Selection */
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  PAY WITH
                </label>
                <Select
                  value={selectedToken?.address}
                  onValueChange={(value) => {
                    const token = availableTokens.find(t => t.address === value)
                    if (token) setSelectedToken(token)
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
            {(((tokenType as string) === 'erc1155') || selectedToken) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {(tokenType as string) === 'erc1155' ? 
                    'certificates to purchase' : 
                    `spend ${selectedToken?.symbol}`
                  }
                </label>
                <Input
                  type="text"
                  value={localFormattedAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={(tokenType as string) === 'erc1155' ? 
                    'enter certificate quantity' : 
                    `enter ${selectedToken?.symbol} amount`
                  }
                  className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                    localAmountError ? 'border-red-500' : ''
                  }`}
                />
                {localAmountError && (
                  <div className="text-sm text-red-500">
                    {localAmountError}
                  </div>
                )}
              </div>
            )}

            {/* Output Display */}
            {(((tokenType as string) === 'erc1155') ? localAmount : (selectedToken && localAmount)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {(tokenType as string) === 'erc1155' ? 'TOTAL COST' : 'ESTIMATED OUTPUT'}
                </label>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        {(tokenType as string) === 'erc1155' ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">$</span>
                          </div>
                        ) : (
                          <Image
                            src={getImageUrl()}
                            alt={getDisplayName()}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-lg font-medium">
                        {(tokenType as string) === 'erc1155' ? (
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
                      {(tokenType as string) === 'erc1155' ? 'USDC' : getDisplayName()}
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
