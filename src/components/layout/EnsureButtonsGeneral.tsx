'use client'

import { PlusCircle, RefreshCw, Flame, ChevronDown, Send } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useGeneralService } from '@/modules/general/service/hooks'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  parseEther, 
  formatEther,
  type Address,
  createWalletClient,
  custom,
  http,
  createPublicClient,
  type PublicClient,
  type WalletClient,
  concat,
  numberToHex,
  toHex,
  encodeFunctionData,
  maxUint256
} from 'viem'
import { base } from 'viem/chains'
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
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'
import { executeSwap } from '@/modules/0x/executeSwap'
import AccountImage from '@/modules/accounts/AccountImage'

interface TokenInfo {
  symbol: string
  address: Address
  decimals: number
  balance?: string
  type?: 'native' | 'currency' | 'certificate'
  imageUrl?: string
}

// Add interface for account search results
interface AccountSearchResult {
  name: string
  path: string
  type: 'account'
  is_agent: boolean
  is_ensurance: boolean
  token_id: number
}

// Add intermediate type for mapped tokens
interface MappedToken {
  symbol: string
  address: Address
  decimals: number
  type: 'currency' | 'certificate'
}

interface EnsureButtonsGeneralProps {
  contractAddress: Address
  showMinus?: boolean
  showBurn?: boolean
  showSend?: boolean
  size?: 'sm' | 'lg'
  imageUrl?: string
  showBalance?: boolean
  tokenName?: string
}

// Update trade type to be a union of all possible values
type TradeType = 'buy' | 'sell' | 'burn' | 'send'

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// Add formatNumber helper function at the top level
const formatNumber = (num: number, decimals: number = 18) => {
  if (num === 0) return '0'
  if (num < 0.000001) return '< 0.000001'
  
  // For tokens with lower decimals (like USDC), show more precise amounts
  if (decimals <= 8) {
    if (num < 0.01) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }
  
  // For tokens with high decimals (like ETH)
  if (num < 0.01) return num.toFixed(6)
  if (num < 1) return num.toFixed(4)
  if (num < 1000) {
    const fixed = num.toFixed(2)
    return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
  }
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const formatTokenBalance = (balance: string | undefined, decimals: number): number => {
  if (!balance) return 0
  const divisor = Math.pow(10, decimals)
  return Number(BigInt(balance)) / divisor
}

// Add these utility functions before the component
const CACHE_KEY = 'token_images_cache'
const CACHE_EXPIRY = 3600000 // 1 hour in milliseconds

interface CachedImage {
  url: string
  timestamp: number
}

const getFromCache = (address: string): string | null => {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    if (!cache) return null

    const images = JSON.parse(cache) as Record<string, CachedImage>
    const cached = images[address]

    if (!cached) return null

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      return null
    }

    return cached.url
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

const saveToCache = (address: string, url: string) => {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    const images = cache ? JSON.parse(cache) : {}
    
    images[address] = {
      url,
      timestamp: Date.now()
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(images))
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

// Add parseAmount helper function before executeSwap
const parseAmount = (amount: string, decimals: number = 18): bigint => {
  // Remove commas from the amount string
  const cleanAmount = amount.replace(/,/g, '')
  // Convert to base units
  const [whole, fraction = ''] = cleanAmount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0')
  const trimmedFraction = paddedFraction.slice(0, decimals)
  const combined = whole + trimmedFraction
  return BigInt(combined)
}

// Add helper function for truncating addresses
const truncateAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function EnsureButtonsGeneral({ 
  contractAddress,
  showMinus = true,
  showBurn = false,
  showSend = true,
  size = 'lg',
  imageUrl = '/assets/no-image-found.png',
  showBalance = true,
  tokenName
}: EnsureButtonsGeneralProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { userAddress } = useGeneralService()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<TradeType>('buy')
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [tokenSymbol, setTokenSymbol] = useState<string>('')
  const debouncedAmount = useDebounce(amount, 500)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([])
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [amountError, setAmountError] = useState<string>('')
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null)
  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300)

  // Create a single publicClient instance
  const publicClient = useMemo(() => createPublicClient({
    chain: base,
    transport: http()
  }), [])

  // Add effect to fetch token details
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!contractAddress || !modalOpen) return
      
      try {
        const symbol = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'symbol'
        }) as string
        
        setTokenSymbol(symbol)
      } catch (error) {
        console.error('Error fetching token details:', error)
      }
    }

    fetchTokenDetails()
  }, [contractAddress, modalOpen, publicClient])

  // Add effect to fetch token balance when needed
  useEffect(() => {
    const fetchBalance = async () => {
      if (!contractAddress || !userAddress) {
        console.log('Skipping balance fetch - missing address:', { contractAddress, userAddress })
        return
      }
      
      // Fetch balance if we're showing it or if it's needed for the modal
      if (showBalance || (modalOpen && (tradeType === 'sell' || tradeType === 'burn'))) {
        try {
          console.log('Fetching balance for:', { contractAddress, userAddress, showBalance, modalOpen, tradeType })
          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: ZORA_COIN_ABI,
            functionName: 'balanceOf',
            args: [userAddress]
          }) as bigint
          console.log('Balance fetched:', formatEther(balance))
          setTokenBalance(balance)
        } catch (error) {
          console.error('Error fetching balance:', error)
        }
      } else {
        console.log('Skipping balance fetch - conditions not met:', { showBalance, modalOpen, tradeType })
      }
    }

    fetchBalance()
  }, [contractAddress, userAddress, modalOpen, showBalance, tradeType, publicClient])

  const handleOpenModal = async (type: TradeType) => {
    if (!authenticated) {
      login()
      return
    }
    
    // Reset all states
    setAmount('')
    setFormattedAmount('')
    setEstimatedOutput('0')
    setSelectedToken(null)
    setAmountError('')
    setIsSimulating(false)
    setAccountSearchQuery('')
    setAccountSearchResults([])
    setIsSearching(false)
    setSelectedAccount(null)
    
    // Then set new type and open modal
    setTradeType(type)
    setModalOpen(true)
    
    try {
      if (authenticated && userAddress) {
        setIsLoadingTokens(true)
        try {
          // Get all supported tokens first (needed for both buy and sell)
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

          if (type === 'buy') {
            // Create a map of supported token addresses (lowercase for comparison)
            const supportedTokens = new Set([
              ...currencies.map((c: any) => c.address.toLowerCase()),
              ...certificates.map((c: any) => c.contract_address.toLowerCase())
            ])

            // Get operator's wallet balances from Alchemy
            const alchemyRes = await fetch(`/api/alchemy/fungible?address=${userAddress}`)
            if (!alchemyRes.ok) throw new Error('Failed to fetch wallet balances')
            
            const alchemyData = await alchemyRes.json()
            
            // Filter and map tokens
            const tokens: TokenInfo[] = alchemyData.data.tokens
              .filter((t: any) => {
                // Always include ETH
                if (!t.tokenAddress) return true
                // For other tokens:
                // 1. Must be in supported list
                // 2. Must not be the destination token
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
                  // Find token type from supported lists
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
                // Always put ETH first
                const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
                if (a.address.toLowerCase() === ETH_ADDRESS) return -1
                if (b.address.toLowerCase() === ETH_ADDRESS) return 1

                // Then sort by type: currencies before certificates
                if (a.type !== b.type) {
                  if (a.type === 'currency') return -1
                  if (b.type === 'currency') return 1
                }

                // Within same type, sort by balance first
                const balanceA = formatTokenBalance(a.balance, a.decimals)
                const balanceB = formatTokenBalance(b.balance, b.decimals)
                if (Math.abs(balanceB - balanceA) > 0.000001) { // Use small epsilon for float comparison
                  return balanceB - balanceA
                }

                // If balances are effectively equal, sort by symbol
                return a.symbol.localeCompare(b.symbol)
              })

            setAvailableTokens(tokens)
            // Set initial selected token to ETH if available
            const ethToken = tokens.find((t) => t.type === 'native')
            if (ethToken) {
              setSelectedToken(ethToken)
            }
          } else if (type === 'sell') {
            // For sell/transform, show all supported tokens as targets
            const tokens: TokenInfo[] = [
              // Add native ETH first
              {
                symbol: 'ETH',
                address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
                decimals: 18,
                type: 'native'
              },
              // Add currencies sorted by symbol
              ...currencies
                .map((c: any) => ({
                  symbol: c.symbol,
                  address: c.address as Address,
                  decimals: c.decimals,
                  type: 'currency' as const
                }))
                .sort((a: MappedToken, b: MappedToken) => a.symbol.localeCompare(b.symbol)),
              // Add certificates (except the current one) sorted by symbol
              ...certificates
                .filter((c: any) => c.contract_address.toLowerCase() !== contractAddress.toLowerCase())
                .map((c: any) => ({
                  symbol: c.symbol,
                  address: c.contract_address as Address,
                  decimals: 18, // Certificates are always 18 decimals
                  type: 'certificate' as const
                }))
                .sort((a: MappedToken, b: MappedToken) => a.symbol.localeCompare(b.symbol))
            ]

            setAvailableTokens(tokens)
            // Set initial selected token to ETH
            setSelectedToken(tokens[0])
          }
        } catch (error) {
          console.error('Error fetching tokens:', error)
          toast.error('Failed to load available tokens')
        } finally {
          setIsLoadingTokens(false)
        }
      }
    } catch (error) {
      console.error('Error opening modal:', error)
      toast.error('Failed to open modal')
    }
  }

  // Add validation for amount against balance
  const validateAmount = (value: string) => {
    if (!value) {
      setAmountError('')
      return
    }
    
    try {
      if (tradeType === 'buy' && selectedToken?.balance) {
        // For buy, check selected token's balance
        const decimals = getTokenDecimals(selectedToken)
        const inputAmount = BigInt(Math.floor(Number(value) * Math.pow(10, decimals)))
        const currentBalance = BigInt(selectedToken.balance)
        
        if (inputAmount > currentBalance) {
          setAmountError('Insufficient balance')
        } else {
          setAmountError('')
        }
      } else if (tradeType === 'sell' || tradeType === 'burn') {
        // For sell/burn, check token balance
        const inputAmount = parseEther(value)
        if (inputAmount > tokenBalance) {
          setAmountError('Insufficient balance')
        } else {
          setAmountError('')
        }
      }
    } catch (error) {
      setAmountError('Invalid amount')
    }
  }

  // Add effect to validate amount when selected token changes
  useEffect(() => {
    if (amount && selectedToken) {
      validateAmount(amount)
    }
  }, [selectedToken, amount])

  // Modify handleAmountChange to respect token decimals
  const handleAmountChange = (value: string) => {
    // Remove existing commas first
    const withoutCommas = value.replace(/,/g, '')
    
    // Only allow numbers and one decimal point
    const cleanValue = withoutCommas.replace(/[^\d.]/g, '')
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length
    if (decimalCount > 1) return

    // Get max decimals based on token
    const maxDecimals = tradeType === 'buy' && selectedToken 
      ? selectedToken.decimals 
      : 18

    // Handle decimal places
    if (cleanValue.includes('.')) {
      const [whole, fraction] = cleanValue.split('.')
      // Limit decimal places to token's decimals
      if (fraction.length > maxDecimals) return
    }

    // Store the clean value for calculations
    setAmount(cleanValue)
    validateAmount(cleanValue)

    // Format with commas for display
    if (cleanValue) {
      const parts = cleanValue.split('.')
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      const formattedValue = parts.length > 1 
        ? `${integerPart}.${parts[1]}`
        : integerPart
      setFormattedAmount(formattedValue)
    } else {
      setFormattedAmount('')
    }
  }

  // Add helper function for token decimals
  const getTokenDecimals = (token: TokenInfo | null) => {
    if (!token) return 18 // Default to 18 decimals
    if (token.symbol === 'USDC') return 6
    if (token.decimals) return token.decimals
    return 18 // Default for most tokens
  }

  // Add helper function to check if address is ETH
  const isEthAddress = (address: string): boolean => {
    return address.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
  }

  // Modify getQuote useEffect
  useEffect(() => {
    const getQuote = async () => {
      if (!authenticated || 
          !selectedToken || 
          !debouncedAmount || 
          !userAddress || 
          Number(debouncedAmount) <= 0 ||
          !modalOpen ||
          tradeType === 'send' || // Skip quote for send operations
          tradeType === 'burn') { // Skip quote for burn operations
        setEstimatedOutput('0')
        return
      }

      // Check balance before proceeding
      try {
        // Convert amount based on token decimals
        const rawAmount = Number(debouncedAmount.replace(/[^\d.]/g, ''))
        if (isNaN(rawAmount)) {
          setEstimatedOutput('0')
          return
        }

        let sellAmountWei: string
        if (tradeType === 'buy' && selectedToken) {
          // For buy, use selected token's decimals
          const multiplier = Math.pow(10, selectedToken.decimals)
          sellAmountWei = BigInt(Math.floor(rawAmount * multiplier)).toString()
        } else {
          // For selling our token (always 18 decimals)
          sellAmountWei = parseEther(debouncedAmount).toString()
        }

        // Balance checks
        if (tradeType === 'buy') {
          if (selectedToken.address.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()) {
            const ethBalance = await publicClient.getBalance({ address: userAddress })
            if (BigInt(sellAmountWei) > ethBalance) {
              setEstimatedOutput('0')
              return
            }
          } else if (selectedToken.balance && BigInt(selectedToken.balance) < BigInt(sellAmountWei)) {
            setEstimatedOutput('0')
            return
          }
        } else if (tradeType === 'sell' && BigInt(sellAmountWei) > tokenBalance) {
          setEstimatedOutput('0')
          return
        }

        setIsSimulating(true)
        try {
          console.log('Quote request:', {
            tradeType,
            sellToken: tradeType === 'buy' ? selectedToken?.address : contractAddress,
            buyToken: tradeType === 'buy' ? contractAddress : selectedToken?.address,
            sellAmount: sellAmountWei,
            taker: userAddress,
            tokenSymbol: selectedToken?.symbol,
            decimals: selectedToken?.decimals
          })

          // Use our backend proxy with correct parameter names
          const params = new URLSearchParams({
            action: 'quote',
            sellToken: tradeType === 'buy' ? selectedToken?.address : contractAddress,
            buyToken: tradeType === 'buy' ? contractAddress : selectedToken?.address,
            sellAmount: sellAmountWei,
            taker: userAddress,
            swapFeeToken: tradeType === 'buy' ? selectedToken?.address : contractAddress,
            slippageBps: '200', // 2% slippage
            swapFeeBps: '100'   // 1% fee
          })

          const response = await fetch(`/api/0x?${params}`)
          if (!response.ok) {
            const errorData = await response.json()
            console.error('Quote error details:', errorData)
            
            // Handle v2 API error structure
            const details = errorData.details || {};
            if (details.validationErrors?.length > 0) {
              toast.error(`Invalid trade parameters: ${details.validationErrors[0]}`);
            } else if (details.code === 'INSUFFICIENT_LIQUIDITY') {
              toast.error('Insufficient liquidity for this trade.');
            } else if (details.code === 'INVALID_TOKEN') {
              toast.error('One or more tokens are not supported.');
            } else if (details.code === 'INSUFFICIENT_BALANCE') {
              toast.error('Insufficient balance for this trade.');
            } else {
              toast.error(details.message || errorData.error || 'Failed to get quote')
            }
            setEstimatedOutput('0')
            return
          }
          
          const data = await response.json()
          console.log('Quote response:', data)

          // Check for liquidity first
          if (!data.liquidityAvailable) {
            console.log('No liquidity available for this trade')
            toast.error('Insufficient liquidity for this trade amount')
            setEstimatedOutput('0')
            return
          }
          
          // Handle v2 API response format
          if (data.buyAmount) {
            // Get the decimals for the output token
            const decimals = tradeType === 'buy' ? 18 : selectedToken.decimals
            
            // Convert to proper decimal representation
            const rawAmount = BigInt(data.buyAmount)
            const amount = Number(rawAmount) / Math.pow(10, decimals)
            
            console.log('Raw amount:', rawAmount.toString())
            console.log('Decimals:', decimals)
            console.log('Converted amount:', amount)
            
            // Format the amount using our new utility
            const formattedAmount = formatNumber(amount, decimals)
            
            console.log('Final formatted amount:', formattedAmount)
            setEstimatedOutput(formattedAmount)
          } else {
            console.error('Unexpected quote response format:', data)
            toast.error('Received invalid quote response')
            setEstimatedOutput('0')
          }
        } catch (error) {
          console.error('Error getting quote:', error)
          toast.error(error instanceof Error ? error.message : 'Failed to get price quote')
          setEstimatedOutput('0')
        } finally {
          setIsSimulating(false)
        }
      } catch (error) {
        console.error('Error checking balance:', error)
        setEstimatedOutput('0')
        return
      }
    }

    getQuote()
  }, [debouncedAmount, selectedToken, authenticated, userAddress, contractAddress, tradeType, modalOpen])

  // Only log estimatedOutput changes when modal is open
  useEffect(() => {
    if (modalOpen) {
      console.log('estimatedOutput changed:', estimatedOutput)
    }
  }, [estimatedOutput, modalOpen])

  // Add these utility functions before the component
  const fetchTokenImage = useCallback(async (address: string): Promise<string | null> => {
    // Check cache first
    const cached = getFromCache(address)
    if (cached) return cached

    try {
      const response = await fetch(`/api/utilities/image?address=${address}`)
      const data = await response.json()
      if (data.url) {
        // Save to cache
        saveToCache(address, data.url)
        return data.url
      }
    } catch (error) {
      console.error('Error fetching token image:', error)
    }
    return null
  }, [])

  useEffect(() => {
    const fetchImages = async () => {
      // Only fetch for tokens we don't have images for yet
      const tokensToFetch = availableTokens.filter(
        token => !tokenImages[token.address]
      )

      if (tokensToFetch.length === 0) return

      // Batch requests in groups of 5
      const batchSize = 5
      for (let i = 0; i < tokensToFetch.length; i += batchSize) {
        const batch = tokensToFetch.slice(i, i + batchSize)
        
        // Fetch images in parallel
        const results = await Promise.all(
          batch.map(token => fetchTokenImage(token.address))
        )

        // Update state with new images
        setTokenImages(prev => {
          const newImages = { ...prev }
          batch.forEach((token, index) => {
            if (results[index]) {
              newImages[token.address] = results[index]!
            }
          })
          return newImages
        })
      }
    }

    if (availableTokens.length > 0) {
      fetchImages()
    }
  }, [availableTokens, fetchTokenImage])

  const handleTrade = async () => {
    if (!authenticated || !userAddress) {
      login()
      return
    }

    const pendingToast = toast.loading('setting everything up...')

    try {
      setIsLoading(true)
      const activeWallet = wallets[0]
      if (!activeWallet) {
        toast.dismiss(pendingToast)
        toast.error('No wallet connected')
        return
      }

      const provider = await activeWallet.getEthereumProvider()

      if (tradeType === 'send') {
        if (!selectedToken?.address) {
          toast.dismiss(pendingToast)
          toast.error('Please enter a recipient address')
          return
        }

        const tokenAmountInWei = parseEther(amount)
        if (tokenAmountInWei > tokenBalance) {
          toast.dismiss(pendingToast)
          toast.error('Insufficient token balance')
          return
        }

        try {
          toast.update(pendingToast, {
            render: 'confirming transfer...',
            type: 'info',
            isLoading: true
          })

          const walletClient = createWalletClient({
            chain: base,
            transport: custom(provider)
          })

          // Use the selected account's TBA address as the recipient
          const recipientAddress = selectedToken.address

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: ZORA_COIN_ABI,
            functionName: 'transfer',
            args: [recipientAddress, tokenAmountInWei],
            chain: base,
            account: userAddress as `0x${string}`
          })
          
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.update(pendingToast, {
            render: 'transfer successful',
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: '!bg-amber-500/20 !text-amber-200 !border-amber-500/30'
          })
          
          setModalOpen(false)
          return
        } catch (error: any) {
          console.error('Transfer failed:', error)
          if (error?.code === 4001 || error?.message?.includes('rejected')) {
            toast.dismiss(pendingToast)
            toast.error('transaction cancelled')
          } else {
            toast.update(pendingToast, {
              render: 'transfer failed',
              type: 'error',
              isLoading: false,
              autoClose: 5000
            })
          }
          return
        }
      } else if (tradeType === 'burn') {
        const tokenAmountInWei = parseEther(amount)
        if (tokenAmountInWei > tokenBalance) {
          toast.dismiss(pendingToast)
          toast.error('Insufficient token balance')
          return
        }

        try {
          toast.update(pendingToast, {
            render: 'confirming burn...',
            type: 'info',
            isLoading: true
          })

          const walletClient = createWalletClient({
            chain: base,
            transport: custom(provider)
          })

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: ZORA_COIN_ABI,
            functionName: 'burn',
            args: [tokenAmountInWei],
            chain: base,
            account: userAddress as `0x${string}`
          })
          
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.update(pendingToast, {
            render: 'tokens burned successfully',
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: '!bg-orange-500/20 !text-orange-200 !border-orange-500/30'
          })
          
          setModalOpen(false)
          return
        } catch (error: any) {
          console.error('Burn failed:', error)
          if (error?.code === 4001 || error?.message?.includes('rejected')) {
            toast.dismiss(pendingToast)
            toast.error('transaction cancelled')
          } else {
            toast.update(pendingToast, {
              render: 'burn failed',
              type: 'error',
              isLoading: false,
              autoClose: 5000
            })
          }
          return
        }
      } else {
        // For buy/sell, need selected token
        if (!selectedToken) {
          toast.dismiss(pendingToast)
          toast.error('Please select a token')
          return
        }

        const sellToken = tradeType === 'buy' ? selectedToken.address : contractAddress
        const buyToken = tradeType === 'buy' ? contractAddress : selectedToken.address

        try {
          // Execute the swap using our updated function (no direct SDK calls)
          const result = await executeSwap({
            sellToken,
            buyToken,
            amount: tradeType === 'buy' 
              ? (selectedToken?.decimals 
                ? parseAmount(amount, selectedToken.decimals).toString()
                : parseEther(amount).toString())
              : parseEther(amount).toString(), // For selling, we use 18 decimals as it's our token
            userAddress,
            provider,
            onStatus: (message, type = 'info') => {
              toast.update(pendingToast, {
                render: message,
                type,
                isLoading: type === 'info'
              })
            }
          })

          // Check if result indicates success
          if (!result.success) {
            console.error('Swap returned without success flag:', result);
            toast.update(pendingToast, {
              render: 'Transaction may have encountered issues',
              type: 'warning',
              isLoading: false,
              autoClose: 5000
            });
            setModalOpen(false);
            return;
          }

          // Get the token symbols for the message
          const toSymbol = String(tradeType === 'buy' ? tokenSymbol : selectedToken?.symbol ?? 'tokens')
          const fromSymbol = String(tradeType === 'buy' ? selectedToken?.symbol ?? 'tokens' : tokenSymbol)
          
          const successMessage = tradeType === 'buy' 
            ? 'success! you have ensured what matters'
            : `success! ${fromSymbol} transformed to ${toSymbol}`

          // Create HTML content for toast with transaction link
          const toastContent = (
            <div>
              <div>{successMessage}</div>
              <a 
                href={`https://basescan.org/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 underline mt-1 block"
              >
                View transaction
              </a>
            </div>
          )

          toast.update(pendingToast, {
            render: toastContent,
            type: 'success',
            isLoading: false,
            autoClose: 5000
          })

          // Refresh balances after successful transaction
          const fetchBalances = async () => {
            if (!userAddress) return
            try {
              const publicClient = createPublicClient({
                chain: base,
                transport: http()
              })
              const balance = await publicClient.readContract({
                address: contractAddress,
                abi: ZORA_COIN_ABI,
                functionName: 'balanceOf',
                args: [userAddress]
              }) as bigint
              setTokenBalance(balance)
            } catch (error) {
              console.error('Failed to refresh balance:', error)
            }
          }
          fetchBalances()

          setModalOpen(false)
        } catch (error: any) {
          console.error('Trade failed:', error)
          toast.dismiss(pendingToast)
          
          // Handle different error types
          const errorMessage = error?.message || 'Failed to execute trade';
          
          // Create a more user-friendly error message
          let userMessage = errorMessage;
          
          if (error?.code === 4001 || errorMessage.includes('rejected')) {
            userMessage = 'Transaction cancelled';
          } else if (errorMessage.includes('failed on-chain')) {
            userMessage = 'Transaction failed on-chain. This may be due to slippage or contract issues.';
          } else if (errorMessage.includes('insufficient funds')) {
            userMessage = 'Insufficient funds to complete this transaction';
          } else if (errorMessage.includes('gas')) {
            userMessage = 'Transaction failed due to gas estimation issues';
          }
          
          toast.error(userMessage);
        }
      }
    } catch (error: any) {
      console.error('Trade failed:', error)
      toast.dismiss(pendingToast)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        toast.error('Transaction cancelled')
      } else {
        toast.error(error?.message || 'Failed to execute trade')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  // Update formatBalance to use the new helper
  const formatBalance = (balance: bigint) => {
    if (balance === BigInt(0)) return '0'
    return formatNumber(Number(formatEther(balance)))
  }

  // Format input value with appropriate decimals
  const formatInputValue = (value: string) => {
    const num = Number(value)
    if (num === 0 || isNaN(num)) return '0'
    
    if (num < 1) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      })
    } else if (num < 1000) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      })
    } else {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    }
  }

  // Add effect for account search
  useEffect(() => {
    const searchAccounts = async () => {
      if (!debouncedAccountSearch || debouncedAccountSearch.length < 2) {
        setAccountSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedAccountSearch)}`)
        if (!response.ok) throw new Error('Search failed')
        
        const data = await response.json()
        // Filter to only account results
        const accountResults = data.filter((item: any) => item.type === 'account')
        setAccountSearchResults(accountResults)
      } catch (error) {
        console.error('Error searching accounts:', error)
        setAccountSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchAccounts()
  }, [debouncedAccountSearch])

  // Add effect to fetch tba_address when account is selected
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!selectedAccount) return

      try {
        const response = await fetch(`/api/accounts/${encodeURIComponent(selectedAccount.name)}`)
        if (!response.ok) throw new Error('Failed to fetch account details')
        
        const data = await response.json()
        if (data.tba_address) {
          setSelectedToken({ 
            address: data.tba_address as Address,
            symbol: selectedAccount.name,
            decimals: 18,
            type: 'native'
          })
        }
      } catch (error) {
        console.error('Error fetching account details:', error)
        toast.error('Failed to fetch account details')
      }
    }

    fetchAccountDetails()
  }, [selectedAccount])

  return (
    <>
      <div className="flex gap-8">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleOpenModal('buy')}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ensure (buy)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showMinus && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenModal('sell')}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`${iconSize} stroke-[1.5] stroke-blue-500 hover:stroke-blue-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>transform (swap)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showBurn && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenModal('burn')}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Flame className={`${iconSize} stroke-[1.5] stroke-orange-500 hover:stroke-orange-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>burn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showSend && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenModal('send')}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className={`${iconSize} stroke-[1.5] stroke-amber-500 hover:stroke-amber-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>send</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Add balance display */}
      {showBalance && (
        <div className="mt-2 text-sm text-gray-400 text-center">
          balance: {formatBalance(tokenBalance)} {tokenSymbol}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {tradeType === 'buy' ? 'ensure' : 
                   tradeType === 'sell' ? 'transform' : 
                   tradeType === 'send' ? 'send' :
                   'burn'}
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenName || tokenSymbol || 'Token'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={tokenSymbol || 'Token'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            {tokenBalance === BigInt(0) && tradeType !== 'buy' ? (
              // Show guidance when no balance
              <div className="space-y-6 text-center">
                <div className="text-lg text-gray-300">
                  {tradeType === 'sell' 
                    ? 'buy to transform' 
                    : 'buy to burn'}
                </div>
                <Button
                  onClick={() => {
                    setModalOpen(false)
                    setTimeout(() => {
                      handleOpenModal('buy')
                    }, 100)
                  }}
                  className="bg-green-600 hover:bg-green-500"
                >
                  ENSURE NOW
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main content grid */}
                <div className="space-y-4">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      AMOUNT
                    </label>
                    <Input
                      type="text"
                      value={formattedAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
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
                    {tradeType !== 'buy' && (
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <span>your balance: {formatBalance(tokenBalance)}</span>
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                          <Image
                            src={imageUrl}
                            alt={tokenSymbol}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Token Selection for Buy/Sell */}
                  {(tradeType === 'buy' || tradeType === 'sell') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">
                        {tradeType === 'buy' ? 'PAY WITH' : 'TRANSFORM TO'}
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
                                        Balance: {formatNumber(formatTokenBalance(token.balance, token.decimals), token.decimals)}
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

                  {/* Estimated Output for Buy/Sell */}
                  {(tradeType === 'buy' || tradeType === 'sell') && selectedToken && amount && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">
                        ESTIMATED OUTPUT
                      </label>
                      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                              <Image
                                src={tradeType === 'buy' ? imageUrl : tokenImages[selectedToken.address] || '/assets/no-image-found.png'}
                                alt={tradeType === 'buy' ? tokenSymbol : selectedToken.symbol}
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
                          <span className="text-gray-400">{tradeType === 'buy' ? tokenSymbol : selectedToken.symbol}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recipient Input for Send */}
                  {tradeType === 'send' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">
                        TO
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={accountSearchQuery}
                          onChange={(e) => {
                            setAccountSearchQuery(e.target.value)
                            setSelectedAccount(null)
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
                                onClick={() => {
                                  setSelectedAccount(result)
                                  setAccountSearchQuery(result.name)
                                }}
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
                      {selectedAccount && selectedToken?.address && (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 space-y-1">
                            <div className="text-sm text-gray-400">
                              {selectedAccount.name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {truncateAddress(selectedToken.address)}
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
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => setModalOpen(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTrade}
              disabled={isLoading || (tradeType === 'burn' || tradeType === 'send' ? !amount || Number(amount) <= 0 : !selectedToken || !amount || Number(amount) <= 0)}
              className={`min-w-[120px] ${
                tradeType === 'buy' 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : tradeType === 'sell'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : tradeType === 'send'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-orange-600 hover:bg-orange-500'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                tradeType === 'buy' ? 'ENSURE' : 
                tradeType === 'sell' ? 'TRANSFORM' : 
                tradeType === 'send' ? 'SEND' :
                'BURN'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
