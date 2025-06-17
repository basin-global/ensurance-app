import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useDebounce } from '@/hooks/useDebounce'
import { 
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address
} from 'viem'
import { base } from 'viem/chains'
import { type Id } from 'react-toastify'
import type { 
  ButtonContext, 
  TokenInfo, 
  AccountSearchResult, 
  OperationType,
  OperationParams,
  TransactionResult,
  QuoteResult
} from '../types'
import {
  createTransactionToast,
  updateTransactionToast,
  successToast,
  errorToast,
  simpleErrorToast
} from '../utils/notifications'
import { batchFetchTokenImages } from '../utils/images'
import { validateAmount, parseTokenAmount } from '../utils/input'
import { formatBalance, formatTokenBalance, formatNumber } from '../utils/formatting'
import { executeSwap } from '@/modules/0x/executeSwap'
import { createTokenboundClient } from '@/config/tokenbound'
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'

interface UseTokenOperationsProps {
  context: ButtonContext
  contractAddress: Address
  tokenId?: string
  tokenSymbol?: string
  tokenName?: string
  tbaAddress?: Address
  variant?: 'grid' | 'list'
}

export const useTokenOperations = ({
  context,
  contractAddress,
  tokenId,
  tokenSymbol = 'Token',
  tokenName,
  tbaAddress,
  variant
}: UseTokenOperationsProps) => {
  const { login, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  const [currentToast, setCurrentToast] = useState<Id | null>(null)
  
  // Buy modal state
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  
  // Quote state
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0')
  const [isSimulating, setIsSimulating] = useState(false)
  const debouncedAmount = useDebounce(amount, 500)
  
  // Account search state
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300)

  // Send modal state
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null)
  const [recipientAddress, setRecipientAddress] = useState<string>('')

  // Burn modal state
  const [isBurning, setIsBurning] = useState(false)

  // Swap modal state
  const [isSwapping, setIsSwapping] = useState(false)

  // Create public client
  const publicClient = useMemo(() => createPublicClient({
    chain: base,
    transport: http()
  }), [])

  /**
   * Get the appropriate wallet client based on context
   */
  const getWalletClient = useCallback(async () => {
    if (!user?.wallet?.address) {
      throw new Error("Please connect your wallet first")
    }

    const walletClient = createWalletClient({
      account: user.wallet.address as `0x${string}`,
      chain: base,
      transport: custom(window.ethereum)
    })

    if (context === 'tokenbound') {
      return createTokenboundClient(walletClient)
    }

    return walletClient
  }, [user?.wallet?.address, context])

  /**
   * Fetch token balance
   */
  const fetchTokenBalance = useCallback(async () => {
    // Skip balance check for grid/list variants
    if (variant === 'grid' || variant === 'list') return
    
    if (!contractAddress || !user?.wallet?.address) return

    try {
      const balance = await publicClient.readContract({
        address: contractAddress,
        abi: ZORA_COIN_ABI,
        functionName: 'balanceOf',
        args: [user.wallet.address]
      }) as bigint
      setTokenBalance(balance)
    } catch (error) {
      console.error('Error fetching token balance:', error)
    }
  }, [contractAddress, user?.wallet?.address, publicClient, variant])

  /**
   * Fetch available tokens for trading
   */
  const fetchAvailableTokens = useCallback(async (operation: OperationType) => {
    if (!authenticated || !user?.wallet?.address) return

    setIsLoadingTokens(true)
    try {
      if (operation === 'buy') {
        // Get supported tokens and user balances
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

        // Create a map of supported token addresses
        const supportedTokens = new Set([
          ...currencies.map((c: any) => c.address.toLowerCase()),
          ...certificates.map((c: any) => c.contract_address.toLowerCase())
        ])

        // Get user's wallet balances
        const alchemyRes = await fetch(`/api/alchemy/fungible?address=${user.wallet.address}`)
        if (!alchemyRes.ok) throw new Error('Failed to fetch wallet balances')
        
        const alchemyData = await alchemyRes.json()
        
        // Filter and map tokens
        const tokens: TokenInfo[] = alchemyData.data.tokens
          .filter((t: any) => {
            // Always include ETH
            if (!t.tokenAddress) return true
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

            const balanceA = formatTokenBalance(a.balance, a.decimals)
            const balanceB = formatTokenBalance(b.balance, b.decimals)
            return balanceB - balanceA
          })

        setAvailableTokens(tokens)
        
        // Set initial selected token to ETH if available
        const ethToken = tokens.find((t) => t.type === 'native')
        if (ethToken) {
          setSelectedToken(ethToken)
        }
      } else if (operation === 'swap') {
        // For swap, show all supported tokens as targets
        const [currenciesRes, certificatesRes] = await Promise.all([
          fetch('/api/currencies'),
          fetch('/api/general')
        ])

        const [currencies, certificates] = await Promise.all([
          currenciesRes.json(),
          certificatesRes.json()
        ])

        const tokens: TokenInfo[] = [
          // Add native ETH first
          {
            symbol: 'ETH',
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
            decimals: 18,
            type: 'native'
          },
          // Add currencies
          ...currencies.map((c: any) => ({
            symbol: c.symbol,
            address: c.address as Address,
            decimals: c.decimals,
            type: 'currency' as const
          })),
          // Add certificates (except current one)
          ...certificates
            .filter((c: any) => c.contract_address.toLowerCase() !== contractAddress.toLowerCase())
            .map((c: any) => ({
              symbol: c.symbol,
              address: c.contract_address as Address,
              decimals: 18,
              type: 'certificate' as const
            }))
        ]

        setAvailableTokens(tokens)
        // Set initial selected token to ETH
        setSelectedToken(tokens[0])
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
      simpleErrorToast('Failed to load available tokens')
    } finally {
      setIsLoadingTokens(false)
    }
  }, [authenticated, user?.wallet?.address, contractAddress])

  /**
   * Reset modal state
   */
  const resetModalState = useCallback(() => {
    setAmount('')
    setFormattedAmount('')
    setAmountError('')
    setEstimatedOutput('0')
    setSelectedToken(null)
    setIsSimulating(false)
    setAccountSearchQuery('')
    setAccountSearchResults([])
    setSelectedAccount(null)
    setRecipientAddress('')
  }, [])

  /**
   * Handle amount change with validation
   */
  const handleAmountChange = useCallback((value: string) => {
    setAmount(value)
    
    // Validate amount against selected token balance
    if (value && selectedToken?.balance) {
      const error = validateAmount(value, selectedToken.balance, 'erc20', selectedToken.decimals)
      setAmountError(error || '')
    } else {
      setAmountError('')
    }
  }, [selectedToken])

  /**
   * Handle token selection
   */
  const handleTokenSelect = useCallback((token: TokenInfo) => {
    setSelectedToken(token)
    
    // Re-validate amount if exists
    if (amount) {
      const error = validateAmount(amount, token.balance || '0', 'erc20', token.decimals)
      setAmountError(error || '')
    }
  }, [amount])

  /**
   * Get price quote for buy and swap operations
   */
  useEffect(() => {
    const getQuote = async () => {
      // Need an operation type to determine quote direction
      // For now, we'll determine based on available tokens context
      // If availableTokens were fetched for 'buy', it's a buy operation
      // If fetched for 'swap', it's a swap operation
      
      if (!authenticated || 
          !selectedToken || 
          !debouncedAmount || 
          !user?.wallet?.address || 
          Number(debouncedAmount) <= 0 ||
          amountError) {
        setEstimatedOutput('0')
        return
      }

      setIsSimulating(true)
      try {
        // Convert amount based on token decimals
        const rawAmount = Number(debouncedAmount.replace(/[^\d.]/g, ''))
        if (isNaN(rawAmount)) {
          setEstimatedOutput('0')
          return
        }

        // Determine if this is a buy or swap operation based on selected token
        const isBuyOperation = selectedToken.address.toLowerCase() !== contractAddress.toLowerCase()
        const isSwapOperation = !isBuyOperation && availableTokens.some(t => t.address.toLowerCase() !== contractAddress.toLowerCase())

        let sellToken: string
        let buyToken: string
        let sellAmount: string
        let outputDecimals: number

        if (isBuyOperation) {
          // Buy operation: spend selectedToken to get contractAddress token
          sellToken = selectedToken.address
          buyToken = contractAddress
          const multiplier = Math.pow(10, selectedToken.decimals)
          sellAmount = BigInt(Math.floor(rawAmount * multiplier)).toString()
          outputDecimals = 18 // Our tokens are 18 decimals
        } else {
          // Swap operation: spend contractAddress token to get selectedToken
          sellToken = contractAddress
          buyToken = selectedToken.address
          const multiplier = Math.pow(10, 18) // Our tokens are 18 decimals
          sellAmount = BigInt(Math.floor(rawAmount * multiplier)).toString()
          outputDecimals = selectedToken.decimals
        }

        // Use 0x API for quote
        const params = new URLSearchParams({
          action: 'quote',
          sellToken,
          buyToken,
          sellAmount,
          taker: user.wallet.address,
          slippageBps: '200', // 2% slippage
          swapFeeBps: '100'   // 1% fee
        })

        const response = await fetch(`/api/0x?${params}`)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Quote error:', errorData)
          setEstimatedOutput('0')
          return
        }
        
        const data = await response.json()
        
        if (!data.liquidityAvailable) {
          setEstimatedOutput('0')
          return
        }
        
        if (data.buyAmount) {
          // Convert to proper decimal representation
          const amount = Number(data.buyAmount) / Math.pow(10, outputDecimals)
          const formattedAmount = formatNumber(amount, outputDecimals)
          setEstimatedOutput(formattedAmount)
        } else {
          setEstimatedOutput('0')
        }
      } catch (error) {
        console.error('Error getting quote:', error)
        setEstimatedOutput('0')
      } finally {
        setIsSimulating(false)
      }
    }

    getQuote()
  }, [debouncedAmount, selectedToken, authenticated, user?.wallet?.address, contractAddress, amountError, availableTokens])

  /**
   * Execute buy operation
   */
  const executeBuy = useCallback(async (amount: string, selectedToken: TokenInfo): Promise<void> => {
    if (!amount || !selectedToken) {
      throw new Error('Amount and token selection required')
    }

    setIsLoading(true)
    const toastId = createTransactionToast('buy')
    setCurrentToast(toastId)

    try {
      const sellToken = selectedToken.address
      const buyToken = contractAddress
      const sellAmount = parseTokenAmount(amount, 'erc20', selectedToken.decimals).toString()

      updateTransactionToast(toastId, 'executing swap...')
      
      const result = await executeSwap({
        sellToken,
        buyToken,
        amount: sellAmount,
        userAddress: user!.wallet!.address as Address,
        provider: window.ethereum,
        onStatus: (message, type = 'info') => {
          updateTransactionToast(toastId, message, type)
        }
      })

      if (result.success && result.txHash) {
        successToast(toastId, 'buy', result.txHash, selectedToken.symbol, tokenSymbol)
        await fetchTokenBalance()
        resetModalState()
      } else {
        throw new Error('Transaction failed')
      }
    } catch (error) {
      errorToast(toastId, error, 'Buy failed')
      throw error
    } finally {
      setIsLoading(false)
      setCurrentToast(null)
    }
  }, [contractAddress, tokenSymbol, user, fetchTokenBalance, resetModalState])

  /**
   * Handle account selection and fetch TBA address
   */
  const handleAccountSelect = useCallback(async (account: AccountSearchResult | undefined) => {
    setSelectedAccount(account || null)
    
    if (account) {
      try {
        const response = await fetch(`/api/accounts/${encodeURIComponent(account.name)}`)
        if (!response.ok) throw new Error('Failed to fetch account details')
        
        const data = await response.json()
        if (data.tba_address) {
          setRecipientAddress(data.tba_address)
        }
      } catch (error) {
        console.error('Error fetching account details:', error)
        simpleErrorToast('Failed to fetch account details')
      }
    } else {
      setRecipientAddress('')
    }
  }, [])

  /**
   * Handle search query change
   */
  const handleSearchQueryChange = useCallback((query: string) => {
    setAccountSearchQuery(query)
    // Clear selection when typing
    if (selectedAccount && query !== selectedAccount.name) {
      setSelectedAccount(null)
      setRecipientAddress('')
    }
  }, [selectedAccount])

  /**
   * Execute send operation  
   */
  const executeSend = useCallback(async (amount: string, recipientAddress: string): Promise<void> => {
    if (!amount || !recipientAddress) {
      throw new Error('Amount and recipient required')
    }

    setIsLoading(true)
    const toastId = createTransactionToast('send')
    setCurrentToast(toastId)

    try {
      const client = await getWalletClient()
      const sendAmount = parseTokenAmount(amount, 'erc20', 18)

      updateTransactionToast(toastId, 'confirming transfer...')

      let txHash: string

      if (context === 'tokenbound') {
        // Use TokenboundClient for TBA operations
        await (client as any).transferERC20({
          account: tbaAddress as `0x${string}`,
          amount: parseFloat(amount),
          recipientAddress: recipientAddress as `0x${string}`,
          erc20tokenAddress: contractAddress,
          erc20tokenDecimals: 18
        })
        txHash = 'pending' // TokenboundClient doesn't return hash directly
      } else {
        // Standard wallet operation
        const hash = await (client as any).writeContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'transfer',
          args: [recipientAddress, sendAmount],
          chain: base,
          account: user!.wallet!.address as `0x${string}`
        })
        
        await publicClient.waitForTransactionReceipt({ hash })
        txHash = hash
      }

      successToast(toastId, 'send', txHash)
      await fetchTokenBalance()
      resetModalState()
    } catch (error) {
      errorToast(toastId, error, 'Send failed')
      throw error
    } finally {
      setIsLoading(false)
      setCurrentToast(null)
    }
  }, [getWalletClient, context, tbaAddress, contractAddress, user, publicClient, fetchTokenBalance, resetModalState])

  /**
   * Execute burn operation
   */
  const executeBurn = useCallback(async (amount: string): Promise<void> => {
    if (!amount) {
      throw new Error('Amount required')
    }

    setIsBurning(true)
    const toastId = createTransactionToast('burn')
    setCurrentToast(toastId)

    try {
      const client = await getWalletClient()
      const burnAmount = parseTokenAmount(amount, 'erc20', 18)

      updateTransactionToast(toastId, 'confirming burn...')

      let txHash: string

      if (context === 'tokenbound') {
        // For TBA operations, use the burn function through TokenboundClient
        // This would need implementation in the tokenbound client, for now use write contract
        const hash = await (client as any).writeContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'burn',
          args: [burnAmount],
          chain: base,
          account: tbaAddress as `0x${string}`
        })
        
        await publicClient.waitForTransactionReceipt({ hash })
        txHash = hash
      } else {
        // Standard wallet operation
        const hash = await (client as any).writeContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'burn',
          args: [burnAmount],
          chain: base,
          account: user!.wallet!.address as `0x${string}`
        })
        
        await publicClient.waitForTransactionReceipt({ hash })
        txHash = hash
      }

      successToast(toastId, 'burn', txHash)
      await fetchTokenBalance()
      resetModalState()
    } catch (error) {
      errorToast(toastId, error, 'Burn failed')
      throw error
    } finally {
      setIsBurning(false)
      setCurrentToast(null)
    }
  }, [getWalletClient, context, contractAddress, tbaAddress, user, publicClient, fetchTokenBalance, resetModalState])

  /**
   * Execute swap operation
   */
  const executeTokenSwap = useCallback(async (amount: string, selectedToken: TokenInfo): Promise<void> => {
    if (!amount || !selectedToken) {
      throw new Error('Amount and token selection required')
    }

    setIsSwapping(true)
    const toastId = createTransactionToast('swap')
    setCurrentToast(toastId)

    try {
      const sellToken = contractAddress // Current token
      const buyToken = selectedToken.address // Target token
      const sellAmount = parseTokenAmount(amount, 'erc20', 18).toString() // Current token amount

      updateTransactionToast(toastId, 'executing swap...')
      
      const result = await executeSwap({
        sellToken,
        buyToken,
        amount: sellAmount,
        userAddress: user!.wallet!.address as Address,
        provider: window.ethereum,
        onStatus: (message: string, type: 'info' | 'success' | 'error' = 'info') => {
          updateTransactionToast(toastId, message, type)
        }
      })

      if (result.success && result.txHash) {
        successToast(toastId, 'swap', result.txHash, tokenSymbol, selectedToken.symbol)
        await fetchTokenBalance()
        resetModalState()
      } else {
        throw new Error('Transaction failed')
      }
    } catch (error) {
      errorToast(toastId, error, 'Swap failed')
      throw error
    } finally {
      setIsSwapping(false)
      setCurrentToast(null)
    }
  }, [contractAddress, tokenSymbol, user, fetchTokenBalance, resetModalState])

  /**
   * Search for accounts
   */
  const searchAccounts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAccountSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      const accountResults = data.filter((item: any) => item.type === 'account')
      setAccountSearchResults(accountResults)
    } catch (error) {
      console.error('Error searching accounts:', error)
      setAccountSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Effect for account search
  useEffect(() => {
    searchAccounts(debouncedAccountSearch)
  }, [debouncedAccountSearch, searchAccounts])

  // Effect for image fetching
  useEffect(() => {
    const fetchImages = async () => {
      const tokensToFetch = availableTokens.filter(
        token => !tokenImages[token.address]
      )

      if (tokensToFetch.length === 0) return

      const addresses = tokensToFetch.map(token => token.address)
      
      await batchFetchTokenImages(addresses, (address, url) => {
        if (url) {
          setTokenImages(prev => ({
            ...prev,
            [address]: url
          }))
        }
      })
    }

    if (availableTokens.length > 0) {
      fetchImages()
    }
  }, [availableTokens, tokenImages])

  // Fetch balance on mount and when user changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchTokenBalance()
    }
  }, [authenticated, user?.wallet?.address, fetchTokenBalance])

  return {
    // State
    isLoading,
    tokenBalance,
    availableTokens,
    isLoadingTokens,
    tokenImages,
    estimatedOutput,
    isSimulating,
    accountSearchResults,
    isSearching,
    accountSearchQuery,
    
    // Buy modal state
    selectedToken,
    amount,
    formattedAmount,
    amountError,

    // Send modal state
    selectedAccount,
    recipientAddress,

    // Loading states
    isBurning,
    isSwapping,

    // Actions
    setAccountSearchQuery,
    fetchAvailableTokens,
    resetModalState,
    handleAmountChange,
    handleTokenSelect,
    handleAccountSelect,
    handleSearchQueryChange,
    executeBuy,
    executeSend,
    executeBurn,
    executeSwap: executeTokenSwap,
    validateAmount: (amount: string, balance: string | bigint, decimals: number) => 
      validateAmount(amount, balance, 'erc20', decimals),

    // Auth
    login,
    authenticated,
    userAddress: user?.wallet?.address
  }
}
