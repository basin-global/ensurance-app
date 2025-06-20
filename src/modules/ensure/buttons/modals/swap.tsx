'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import Image from 'next/image'
import { RefreshCw, ChevronDown, Loader2 } from 'lucide-react'
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
import { useOperations } from '../hooks/useOperations'
import { toast } from 'react-toastify'

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  context: ButtonContext
  tokenType?: TokenType
  contractAddress: string
  tokenId?: string
  tbaAddress?: string
  pricePerToken?: bigint
  primaryMintActive?: boolean
  onRefreshBalance?: () => void
}

export function SwapModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  context,
  tokenType = 'erc20',
  contractAddress,
  tokenId,
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  onRefreshBalance
}: SwapModalProps) {
  const { authenticated, user, login } = usePrivy()
  
  // Modal state
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [localAmountError, setLocalAmountError] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  
  // Trading state
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [estimatedOutput, setEstimatedOutput] = useState('0')
  const [isSimulating, setIsSimulating] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  const [targetTokenDecimals, setTargetTokenDecimals] = useState<number>(18)
  
  // Debounce amount for quote fetching
  const debouncedAmount = useDebounce(localAmount, 500)
  
  // Create public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const {
    isSwapping: isLoading,
    executeSwap
  } = useOperations({
    context,
    contractAddress,
    tokenId,
    tokenType,
    tbaAddress,
    pricePerToken,
    primaryMintActive,
    tokenName,
    tokenSymbol
  })

  // Add effect to fetch available tokens when modal opens
  useEffect(() => {
    const fetchAvailableTokens = async () => {
      if (!isOpen || !authenticated) return
      
      setIsLoadingTokens(true)
      try {
        // Get all supported tokens from both currencies and general certificates
        const [currenciesRes, certificatesRes] = await Promise.all([
          fetch('/api/currencies'),
          fetch('/api/general')
        ])

        if (!currenciesRes.ok || !certificatesRes.ok) {
          throw new Error('Failed to fetch supported tokens')
        }

        const [currencies, certificates] = await Promise.all([
          currenciesRes.json(),
          certificatesRes.json()
        ])

        // Create comprehensive token list for "TRANSFORM TO" dropdown
        const tokens: TokenInfo[] = []
        
        // Add native ETH if current token is not ETH
        if (tokenType !== 'native') {
          tokens.push({
            symbol: 'ETH',
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
            decimals: 18,
            type: 'native'
          })
        }
        
        // Add currencies (except the current one if it's a currency) sorted by symbol
        const filteredCurrencies = currencies
          .filter((c: any) => c.address.toLowerCase() !== contractAddress.toLowerCase())
          .map((c: any) => ({
            symbol: c.symbol,
            address: c.address as Address,
            decimals: c.decimals,
            type: 'currency' as const
          }))
          .sort((a: any, b: any) => a.symbol.localeCompare(b.symbol))
        
        tokens.push(...filteredCurrencies)
        
        // Add certificates (except the current one) sorted by symbol
        const filteredCertificates = certificates
          .filter((c: any) => c.contract_address.toLowerCase() !== contractAddress.toLowerCase())
          .map((c: any) => ({
            symbol: c.symbol,
            address: c.contract_address as Address,
            decimals: 18, // Certificates are always 18 decimals
            type: 'certificate' as const
          }))
          .sort((a: any, b: any) => a.symbol.localeCompare(b.symbol))
        
        tokens.push(...filteredCertificates)

        setAvailableTokens(tokens)
        // Set initial selected token to ETH
        setSelectedToken(tokens[0])
        
        // Fetch images for the tokens
        if (tokens.length > 0) {
          fetchTokenImages(tokens)
        }
      } catch (error) {
        console.error('Error fetching tokens:', error)
        toast.error('Failed to load available tokens')
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchAvailableTokens()
  }, [isOpen, authenticated, contractAddress])

  // Fetch token images
  const fetchTokenImages = async (tokens: TokenInfo[]) => {
    console.log('Fetching images for tokens:', tokens.map(t => ({ symbol: t.symbol, address: t.address, type: t.type })))
    
    const imagePromises = tokens.map(async (token) => {
      try {
        console.log(`Fetching image for ${token.symbol} (${token.address})`)
        const response = await fetch(`/api/utilities/image?address=${token.address}`)
        console.log(`Image response for ${token.symbol}:`, response.status, response.ok)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Image data for ${token.symbol}:`, data)
          return { address: token.address, url: data.url }
        }
      } catch (error) {
        console.error(`Error fetching image for ${token.address}:`, error)
      }
      return { address: token.address, url: null }
    })

    const results = await Promise.all(imagePromises)
    const imageMap: Record<string, string> = {}
    
    results.forEach(({ address, url }) => {
      if (url) {
        imageMap[address] = url
      }
    })
    
    console.log('Final image map:', imageMap)
    setTokenImages(imageMap)
  }

  // Fetch target token decimals using viem
  const fetchTargetTokenDecimals = async () => {
    if ((tokenType as string) === 'erc1155') {
      setTargetTokenDecimals(0) // ERC1155 tokens don't have decimals
      return
    }

    try {
      const decimals = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ type: 'uint8' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'decimals'
      })
      setTargetTokenDecimals(Number(decimals))
    } catch (error) {
      console.error('Error fetching target token decimals:', error)
      setTargetTokenDecimals(18) // Default fallback
    }
  }

  // Fetch token balance (what we're swapping FROM)
  const fetchTokenBalance = async () => {
    if (!user?.wallet?.address) return
    
    const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address

    try {
      if ((tokenType as string) === 'erc1155') {
        const balance = await publicClient.readContract({
          address: contractAddress as Address,
          abi: [
            {
              inputs: [
                { name: 'account', type: 'address' },
                { name: 'id', type: 'uint256' }
              ],
              name: 'balanceOf',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'balanceOf',
          args: [addressToQuery as Address, BigInt(tokenId || '0')]
        })
        setTokenBalance(balance as bigint)
      } else if ((tokenType as string) === 'native') {
        const balance = await publicClient.getBalance({
          address: addressToQuery as Address
        })
        setTokenBalance(balance)
      } else if ((tokenType as string) === 'erc20' || (tokenType as string) === 'erc721') {
        const balance = await publicClient.readContract({
          address: contractAddress as Address,
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
          args: [addressToQuery as Address]
        })
        setTokenBalance(balance as bigint)
      }
    } catch (error) {
      console.error('Error fetching token balance:', error)
      setTokenBalance(BigInt(0))
    }
  }

  // Get price quote from 0x API
  const fetchQuote = async (
    sellToken: string,
    buyToken: string, 
    sellAmount: string
  ) => {
    if (!user?.wallet?.address || !sellAmount || Number(sellAmount) <= 0) {
      setEstimatedOutput('0')
      return
    }

    const takerAddress = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address

    setIsSimulating(true)
    try {
      const params = new URLSearchParams({
        action: 'quote',
        sellToken,
        buyToken,
        sellAmount,
        taker: takerAddress,
        slippageBps: '200',
        swapFeeBps: '100'
      })

      const response = await fetch(`/api/0x?${params}`)
      if (!response.ok) {
        setEstimatedOutput('0')
        return
      }
      
      const data = await response.json()
      
      if (!data.liquidityAvailable || !data.buyAmount) {
        setEstimatedOutput('0')
        return
      }
      
      const amount = Number(data.buyAmount) / Math.pow(10, selectedToken?.decimals || 18)
      const formattedAmount = formatNumber(amount, selectedToken?.decimals || 18)
      setEstimatedOutput(formattedAmount)
    } catch (error) {
      console.error('Error getting quote:', error)
      setEstimatedOutput('0')
    } finally {
      setIsSimulating(false)
    }
  }

  // Helper functions
  const getDisplayName = () => {
    return tokenName || tokenSymbol
  }

  const getImageUrl = () => {
    return imageUrl
  }

  const isButtonDisabled = () => {
    if (isLoading || !localAmount || Number(localAmount) <= 0) return true
    if (!selectedToken) return true
    return !!localAmountError
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    // For ERC721 tokens, only allow 1
    if ((tokenType as string) === 'erc721') {
      setLocalAmount('1')
      setLocalFormattedAmount('1')
      setLocalAmountError('')
      return
    }
    
    // For ERC1155 tokens, only allow whole numbers
    if ((tokenType as string) === 'erc1155') {
      const wholeNumberValue = value.replace(/[^\d]/g, '')
      setLocalAmount(wholeNumberValue)
      setLocalFormattedAmount(wholeNumberValue)
      
      // Validate against balance
      if (wholeNumberValue && tokenBalance) {
        const inputAmount = BigInt(Math.floor(Number(wholeNumberValue)))
        if (inputAmount > tokenBalance) {
          setLocalAmountError('Amount exceeds available balance')
        } else {
          setLocalAmountError('')
        }
      } else {
        setLocalAmountError('')
      }
      return
    }
    
    // For ERC20/native tokens, use actual decimals from token contract
    const maxDecimals = targetTokenDecimals
    const inputTokenType = tokenType === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, inputTokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)

    // Validate against balance using actual decimals
    if (result.cleanValue && tokenBalance) {
      const numericValue = Number(result.cleanValue)
      const decimals = targetTokenDecimals || 18 // Fallback to 18 if not set yet
      
      // Check if we have valid numbers before BigInt conversion
      if (isNaN(numericValue) || isNaN(decimals)) {
        setLocalAmountError('Invalid amount')
        return
      }
      
      const scaledAmount = numericValue * Math.pow(10, decimals)
      
      // Check if the scaled amount is a valid number
      if (isNaN(scaledAmount) || !isFinite(scaledAmount)) {
        setLocalAmountError('Amount too large')
        return
      }
      
      const inputAmount = BigInt(Math.floor(scaledAmount))
      
      if (inputAmount > tokenBalance) {
        setLocalAmountError('Amount exceeds available balance')
      } else {
        setLocalAmountError('')
      }
    } else {
      setLocalAmountError('')
    }
  }

  // Reset and load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setLocalAmountError('')
      setSelectedToken(null)
      setEstimatedOutput('0')
      
      // Always fetch target token decimals
      fetchTargetTokenDecimals()
      
      if (authenticated) {
        fetchTokenBalance()
      }
    }
  }, [isOpen, authenticated])

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
    if (localAmount !== debouncedAmount) {
      setEstimatedOutput('0')
    }
  }, [localAmount, debouncedAmount])

  // Fetch quote when debounced amount changes
  useEffect(() => {
    if (selectedToken && debouncedAmount) {
      const sellAmount = (Number(debouncedAmount) * Math.pow(10, targetTokenDecimals)).toString()
      fetchQuote(contractAddress, selectedToken.address, sellAmount)
    }
  }, [debouncedAmount, selectedToken, contractAddress, targetTokenDecimals])

  const handleExecute = async () => {
    if (!authenticated) {
      login()
      return
    }

    if (!localAmount || !selectedToken) return
    
    try {
      await executeSwap(localAmount, selectedToken)
      
      // Refresh balance and close modal
      onRefreshBalance?.()
      onClose()
    } catch (error) {
      console.error('Swap execution error:', error)
    }
  }

  const getDisplayAmount = () => {
    if (tokenType === 'erc721') return '1'
    return localFormattedAmount || '0'
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
      modal={true}
    >
      <DialogContent 
        className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl z-[9999] fixed"
        onClick={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                transform
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
          {!authenticated ? (
            /* Not Connected - Show Connect Account */
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-500" />
                </div>
                <div className="text-xl font-semibold text-white">
                  connect to transform
                </div>
              </div>
            </div>
          ) : tokenBalance === BigInt(0) ? (
            // Show guidance when no balance
            <div className="space-y-6 text-center">
              <div className="text-lg text-gray-300">
                buy to transform
              </div>
              <p className="text-sm text-gray-400">
                You need {getDisplayName()} to transform them
              </p>
            </div>
          ) : (
            /* Authenticated - Show Swap Form */
            <div className="space-y-4">
              {/* Token Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  TRANSFORM TO
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
                  <SelectContent className="bg-gray-900 border-gray-800 z-[10000]">
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

              {/* Amount Input */}
              {selectedToken && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {`spend ${getDisplayName()}`}
                  </label>
                  <Input
                    type="text"
                    value={localFormattedAmount}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={`enter ${getDisplayName()} amount`}
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
                    Balance: {formatNumber(Number(tokenBalance) / Math.pow(10, targetTokenDecimals), targetTokenDecimals)} {getDisplayName()}
                  </div>
                </div>
              )}

              {/* Output Display */}
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
                            src={tokenImages[selectedToken.address] || '/assets/no-image-found.png'}
                            alt={selectedToken.symbol}
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
                      <span className="text-gray-400">
                        {selectedToken.symbol}
                      </span>
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
            disabled={authenticated && isButtonDisabled()}
            className="min-w-[120px] bg-blue-600 hover:bg-blue-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : authenticated ? (
              'TRANSFORM'
            ) : (
              'CONNECT'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
