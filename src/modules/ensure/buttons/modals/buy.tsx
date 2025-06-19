'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
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
  tokenId?: string
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
  tokenId,
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  onRefreshBalance
}: BuyModalProps) {
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
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0))
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
    isLoading,
    executeBuy
  } = useOperations({
    context,
    contractAddress,
    tokenId,
    tokenType,
    tbaAddress,
    pricePerToken,
    primaryMintActive
  })

  // Fetch available tokens for trading
  const fetchAvailableTokens = async () => {
    if (!authenticated || !user?.wallet?.address) return

    setIsLoadingTokens(true)
    try {
      const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address
      
      // Get supported tokens and user balances
      const [currenciesRes, certificatesRes, alchemyRes] = await Promise.all([
        fetch('/api/currencies'),
        fetch('/api/general'),
        fetch(`/api/alchemy/fungible?address=${addressToQuery}`)
      ])

      if (!currenciesRes.ok || !certificatesRes.ok || !alchemyRes.ok) {
        throw new Error('Failed to fetch supported tokens')
      }

      const [currencies, certificates, alchemyData] = await Promise.all([
        currenciesRes.json(),
        certificatesRes.json(),
        alchemyRes.json()
      ])

      // Create a map of supported token addresses
      const supportedTokens = new Set([
        ...currencies.map((c: any) => c.address.toLowerCase()),
        ...certificates.map((c: any) => c.contract_address.toLowerCase())
      ])

      // Filter and map tokens
      const tokens: TokenInfo[] = alchemyData.data.tokens
        .filter((t: any) => {
          // Handle ETH case
          if (!t.tokenAddress) {
            const ethPlaceholder = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            return contractAddress.toLowerCase() !== ethPlaceholder.toLowerCase()
          }
          // For other tokens: must be supported and not the destination token
          return supportedTokens.has(t.tokenAddress.toLowerCase()) &&
                 t.tokenAddress.toLowerCase() !== contractAddress.toLowerCase()
        })
        .map((t: any): TokenInfo | null => {
          // Handle native ETH
          if (!t.tokenAddress) {
            return {
              symbol: 'ETH',
              address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
              decimals: 18,
              balance: t.tokenBalance,
              type: 'native'
            }
          }
          // Handle other tokens
          if (t.tokenMetadata?.decimals != null && t.tokenMetadata?.symbol) {
            const isCurrency = currencies.some((c: any) => 
              c.address.toLowerCase() === t.tokenAddress.toLowerCase()
            )
            return {
              symbol: t.tokenMetadata.symbol,
              address: t.tokenAddress as Address,
              decimals: t.tokenMetadata.decimals,
              balance: t.tokenBalance,
              type: isCurrency ? 'currency' : 'certificate'
            }
          }
          return null
        })
        .filter((t: TokenInfo | null): t is TokenInfo => t !== null)
        .sort((a: TokenInfo, b: TokenInfo) => {
          // ETH first, then by type, then by balance
          const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
          if (a.address.toLowerCase() === ETH_ADDRESS) return -1
          if (b.address.toLowerCase() === ETH_ADDRESS) return 1

          if (a.type !== b.type) {
            if (a.type === 'currency') return -1
            if (b.type === 'currency') return 1
          }

          const balanceA = Number(a.balance) / Math.pow(10, a.decimals)
          const balanceB = Number(b.balance) / Math.pow(10, b.decimals)
          return balanceB - balanceA
        })

      setAvailableTokens(tokens)
      
      // Fetch images for the tokens
      if (tokens.length > 0) {
        fetchTokenImages(tokens)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Fetch USDC balance for ERC1155 tokens
  const fetchUsdcBalance = async () => {
    if (!user?.wallet?.address || (tokenType as string) !== 'erc1155') return
    
    const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address
    
    try {
      const balance = await publicClient.readContract({
        address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as Address,
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
      setUsdcBalance(balance as bigint)
    } catch (error) {
      console.error('Error fetching USDC balance:', error)
      setUsdcBalance(BigInt(0))
    }
  }

  // Fetch token images
  const fetchTokenImages = async (tokens: TokenInfo[]) => {
    const imagePromises = tokens.map(async (token) => {
      try {
        const response = await fetch(`/api/utilities/image?address=${token.address}`)
        if (response.ok) {
          const data = await response.json()
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
      
      const amount = Number(data.buyAmount) / Math.pow(10, targetTokenDecimals)
      const formattedAmount = formatNumber(amount, targetTokenDecimals)
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
    
    if ((tokenType as string) === 'erc1155') {
      return !!localAmountError
    }
    
    if (!selectedToken) return true
    return !!localAmountError
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    // For ERC1155 tokens, only allow whole numbers
    if ((tokenType as string) === 'erc1155') {
      // Remove any non-digit characters and ensure it's a whole number
      const wholeNumberValue = value.replace(/[^\d]/g, '')
      setLocalAmount(wholeNumberValue)
      setLocalFormattedAmount(wholeNumberValue)
      
      // Validate against USDC balance
      if (wholeNumberValue && pricePerToken && usdcBalance) {
        const quantity = BigInt(Math.floor(Number(wholeNumberValue)))
        const totalCost = quantity * pricePerToken
        
        if (totalCost > usdcBalance) {
          setLocalAmountError('Insufficient USDC balance')
        } else {
          setLocalAmountError('')
        }
      } else {
        setLocalAmountError('')
      }
      return
    }
    
    // For other token types, use existing logic
    const maxDecimals = selectedToken ? getTokenDecimals(selectedToken.symbol, selectedToken.decimals) : 18
    const inputTokenType = selectedToken?.type === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, inputTokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)

    // Validate based on token type
    if ((tokenType as string) === 'erc1155') {
      // For ERC1155 tokens, validate against USDC balance
      if (result.cleanValue && pricePerToken && usdcBalance) {
        const quantity = BigInt(Math.floor(Number(result.cleanValue)))
        const totalCost = quantity * pricePerToken
        
        if (totalCost > usdcBalance) {
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
        fetchAvailableTokens()
        fetchUsdcBalance()
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
    if (localAmount !== debouncedAmount && (tokenType as string) !== 'erc1155') {
      setEstimatedOutput('0')
    }
  }, [localAmount, debouncedAmount, tokenType])

  // Fetch quote when debounced amount changes
  useEffect(() => {
    if (selectedToken && debouncedAmount && (tokenType as string) !== 'erc1155') {
      const sellAmount = (Number(debouncedAmount) * Math.pow(10, selectedToken.decimals)).toString()
      fetchQuote(selectedToken.address, contractAddress, sellAmount)
    }
  }, [debouncedAmount, selectedToken, contractAddress, tokenType])

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
      console.error('Buy execution error:', error)
    }
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
                      Your balance: {formatNumber(Number(usdcBalance) / 1_000_000, 2)} USDC
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
                            `$${(Number(BigInt(Math.floor(Number(localAmount))) * pricePerToken) / 1_000_000).toFixed(2)}` : 
                            '$0.00'
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
                      {(tokenType as string) === 'erc1155' ? '' : getDisplayName()}
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
