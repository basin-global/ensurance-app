import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useDebounce } from '@/hooks/useDebounce'
import { 
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  maxUint256,
  formatEther,
  formatUnits,
  encodeFunctionData,
  numberToHex,
  concat
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
  QuoteResult,
  UsdcOperationData,
  ERC1155BalanceInfo,
  TokenType
} from '../types'
import { SPECIFIC_CONTRACTS } from '../types'
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
import { createTokenboundActions } from '@/lib/tokenbound'
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'
import ZORA_1155_ABI from '@/abi/Zora1155proxy.json'
import ZORA_ERC20_MINTER_ABI from '@/abi/ZoraERC20Minter.json'

// ERC20 ABI for decimals and balance
const erc20Abi = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

interface UseTokenOperationsProps {
  context: ButtonContext
  contractAddress: Address
  tokenId?: string
  tokenSymbol?: string
  tokenName?: string
  tokenType?: TokenType
  tbaAddress?: Address
  variant?: 'grid' | 'list' | 'page'
  initialBalance?: string
  // ERC1155 specific props
  maxSupply?: bigint
  totalMinted?: bigint
  pricePerToken?: bigint
  primaryMintActive?: boolean
}

export const useTokenOperations = ({
  context,
  contractAddress,
  tokenId,
  tokenSymbol = 'Token',
  tokenName,
  tokenType = 'erc20',
  tbaAddress,
  variant,
  initialBalance,
  // ERC1155 specific props
  maxSupply,
  totalMinted,
  pricePerToken,
  primaryMintActive = false
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
  
  // ERC1155 specific state
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0))
  const [erc1155Balance, setErc1155Balance] = useState<ERC1155BalanceInfo>({
    tokenBalance: BigInt(0),
    usdcBalance: BigInt(0),
    formattedTokenBalance: '0',
    formattedUsdcBalance: '0.00'
  })
  
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

    // Always return the standard wallet client
    // Tokenbound operations will be handled through createTokenboundActions
    return walletClient
  }, [user?.wallet?.address])

  /**
   * Fetch ERC1155 balances and USDC balance for specific context
   */
  const fetchERC1155Balances = useCallback(async () => {
    // Determine which address to use based on context
    const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user?.wallet?.address
    
    if (!addressToQuery || !tokenId) return

    try {
      console.log('🔍 Fetching ERC1155 balances for:', {
        context,
        address: addressToQuery,
        contractAddress,
        tokenId
      })

      // Fetch token balance from ERC1155 contract
      const tokenBalance = await publicClient.readContract({
        address: contractAddress,
        abi: ZORA_1155_ABI,
        functionName: 'balanceOf',
        args: [addressToQuery as `0x${string}`, BigInt(tokenId)]
      }) as bigint

      // Fetch USDC balance
      const usdcBalance = await publicClient.readContract({
        address: SPECIFIC_CONTRACTS.usdc,
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
        args: [addressToQuery as `0x${string}`]
      }) as bigint

      const formattedTokenBalance = tokenBalance.toString()
      const formattedUsdcBalance = (Number(usdcBalance) / 1_000_000).toFixed(6)

      console.log('🔍 ERC1155 balances fetched:', {
        context,
        tokenBalance: formattedTokenBalance,
        usdcBalance: formattedUsdcBalance,
        addressQueried: addressToQuery
      })

      // Debug: For specific context, verify with Alchemy API
      if (context === 'specific') {
        try {
          const alchemyResponse = await fetch(`/api/alchemy/fungible?address=${addressToQuery}`)
          if (alchemyResponse.ok) {
            const alchemyData = await alchemyResponse.json()
            const usdcToken = alchemyData.data?.tokens?.find((t: any) => 
              t.tokenAddress?.toLowerCase() === SPECIFIC_CONTRACTS.usdc.toLowerCase()
            )
            if (usdcToken) {
              console.log('🔍 Alchemy USDC data:', {
                alchemyBalance: usdcToken.tokenBalance,
                alchemyFormatted: usdcToken.tokenBalance ? (Number(usdcToken.tokenBalance) / 1_000_000).toFixed(6) : '0',
                contractBalance: usdcBalance.toString(),
                contractFormatted: formattedUsdcBalance
              })
            } else {
              console.log('🔍 USDC not found in Alchemy response - user may have 0 balance or token not indexed')
            }
          }
        } catch (alchemyError) {
          console.log('🔍 Alchemy verification failed (non-critical):', alchemyError)
        }
      }

      setErc1155Balance({
        tokenBalance,
        usdcBalance,
        formattedTokenBalance,
        formattedUsdcBalance
      })

      // Also set the legacy states for compatibility
      setTokenBalance(tokenBalance)
      setUsdcBalance(usdcBalance)
    } catch (error) {
      console.error('❌ Error fetching ERC1155 balances:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }, [context, contractAddress, tokenId, user?.wallet?.address, tbaAddress, publicClient])

  /**
   * Fetch token balance based on context and token type
   */
  const fetchTokenBalance = useCallback(async () => {
    // For grid/list variants with initial balance, use that instead of fetching
    if ((variant === 'grid' || variant === 'list') && initialBalance) {
      setTokenBalance(BigInt(initialBalance))
      return
    }
    
    // Skip balance check for grid/list variants without initial balance
    if (variant === 'grid' || variant === 'list') return
    
    // Use ERC1155 balance fetching for specific context OR tokenbound ERC1155
    if (context === 'specific' || (context === 'tokenbound' && tokenType === 'erc1155')) {
      return fetchERC1155Balances()
    }
    
    if (!user?.wallet?.address) return

    try {
      if (context === 'tokenbound') {
        if (!tbaAddress) {
          console.warn('No TBA address provided for tokenbound context')
          return
        }

        // Handle different token types for tokenbound accounts (non-ERC1155)
        if (tokenType === 'native') {
          // For native ETH, use getBalance
          const balance = await publicClient.getBalance({
            address: tbaAddress
          })
          setTokenBalance(balance)
        } else if (tokenType === 'erc20' && contractAddress) {
          // For ERC20 tokens
          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [tbaAddress],
          })
          setTokenBalance(balance as bigint)
        } else if (tokenType === 'erc721' && contractAddress) {
          // For ERC721, check if the TBA owns this specific token
          try {
            const owner = await publicClient.readContract({
              address: contractAddress,
              abi: [
                {
                  inputs: [{ name: "tokenId", type: "uint256" }],
                  name: "ownerOf",
                  outputs: [{ type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
              ],
              functionName: 'ownerOf',
              args: [BigInt(tokenId || '0')]
            })
            // Set balance to 1 if TBA owns the token, 0 otherwise
            setTokenBalance(owner.toLowerCase() === tbaAddress.toLowerCase() ? BigInt(1) : BigInt(0))
          } catch (error) {
            // Token doesn't exist or other error
            setTokenBalance(BigInt(0))
          }
        }
      } else {
        // Standard wallet operations (general context)
        if (!contractAddress) return
        
        const balance = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'balanceOf',
          args: [user.wallet.address]
        }) as bigint
        setTokenBalance(balance)
      }
    } catch (error) {
      console.error('Error fetching token balance:', error)
      setTokenBalance(BigInt(0))
    }
  }, [
    variant, 
    initialBalance,
    context, 
    tokenType,
    fetchERC1155Balances, 
    user?.wallet?.address, 
    tbaAddress, 
    contractAddress, 
    tokenId, 
    publicClient
  ])

  /**
   * Check USDC approval for ERC1155 operations
   */
  const checkUsdcApproval = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!user?.wallet?.address || context !== 'specific') return false

    try {
      const allowance = await publicClient.readContract({
        address: SPECIFIC_CONTRACTS.usdc,
        abi: [
          {
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            name: 'allowance',
            outputs: [{ type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'allowance',
        args: [user.wallet.address as `0x${string}`, SPECIFIC_CONTRACTS.erc20Minter]
      }) as bigint

      return allowance >= amount
    } catch (error) {
      console.error('Error checking USDC approval:', error)
      return false
    }
  }, [user?.wallet?.address, context, publicClient])

  /**
   * Get USDC operation data for ERC1155 operations
   */
  const getUsdcOperationData = useCallback(async (quantity: string): Promise<UsdcOperationData | null> => {
    if (context !== 'specific' || !pricePerToken || !user?.wallet?.address) return null

    const quantityBigInt = BigInt(Math.floor(Number(quantity)))
    const totalPrice = pricePerToken * quantityBigInt
    const needsApproval = !(await checkUsdcApproval(totalPrice))

    return {
      totalPrice,
      quantity: quantityBigInt,
      needsApproval,
      userBalance: erc1155Balance.usdcBalance,
      pricePerToken
    }
  }, [context, pricePerToken, user?.wallet?.address, checkUsdcApproval, erc1155Balance.usdcBalance])

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

        // Get balances for the appropriate address (TBA for tokenbound, user wallet for others)
        const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address
        const alchemyRes = await fetch(`/api/alchemy/fungible?address=${addressToQuery}`)
        if (!alchemyRes.ok) throw new Error('Failed to fetch wallet balances')
        
        const alchemyData = await alchemyRes.json()
        
        // Filter and map tokens
        const tokens: TokenInfo[] = alchemyData.data.tokens
          .filter((t: any) => {
            // Handle ETH case - exclude if we're buying ETH
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
  }, [authenticated, user?.wallet?.address, contractAddress, context, tbaAddress])

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

  // We'll define executeBuy after executeTokenSwap to avoid reference issues

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
      updateTransactionToast(toastId, 'confirming transfer...')

      let txHash: string

      if (context === 'tokenbound') {
        if (!tbaAddress || !user?.wallet?.address) {
          throw new Error('TBA address and user wallet required for tokenbound operations')
        }

        const walletClient = await getWalletClient()
        const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

        // Handle different token types for tokenbound
        if (tokenType === 'native') {
          // Transfer native ETH
          await tokenboundActions.transferETH({
            amount: parseFloat(amount),
            recipientAddress: recipientAddress as `0x${string}`,
            chainId: base.id
          })
          txHash = 'pending' // TokenboundClient doesn't return hash directly
        } else if (tokenType === 'erc20' && contractAddress) {
          // Transfer ERC20 tokens
          await tokenboundActions.transferERC20({
            amount: parseFloat(amount),
            recipientAddress: recipientAddress as `0x${string}`,
            erc20tokenAddress: contractAddress,
            erc20tokenDecimals: 18,
            chainId: base.id
          })
          txHash = 'pending'
        } else if (tokenType === 'erc721' && contractAddress && tokenId) {
          // Transfer ERC721 NFT
          const result = await tokenboundActions.transferNFT({
            contract_address: contractAddress,
            token_id: tokenId,
            contract: { type: 'ERC721' },
            chain: 'base'
          } as any, recipientAddress as `0x${string}`)
          txHash = result.hash
        } else if (tokenType === 'erc1155' && contractAddress && tokenId) {
          // Transfer ERC1155 NFT
          const result = await tokenboundActions.transferNFT({
            contract_address: contractAddress,
            token_id: tokenId,
            contract: { type: 'ERC1155' },
            chain: 'base'
          } as any, recipientAddress as `0x${string}`, parseInt(amount))
          txHash = result.hash
        } else {
          throw new Error(`Unsupported token type: ${tokenType}`)
        }
      } else if (context === 'specific') {
        // Handle ERC1155 send directly for specific context
        const walletClient = await getWalletClient()
        const sendAmount = BigInt(Math.floor(Number(amount)))
        
        if (!tokenId) {
          throw new Error('Token ID required for ERC1155 transfer')
        }

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ZORA_1155_ABI,
          functionName: 'safeTransferFrom',
          args: [
            user!.wallet!.address,
            recipientAddress as `0x${string}`,
            BigInt(tokenId),
            sendAmount,
            '0x' // No data needed
          ],
          chain: base,
          account: user!.wallet!.address as `0x${string}`
        })
        
        await publicClient.waitForTransactionReceipt({ hash })
        txHash = hash
      } else {
        // Standard wallet operation for general context (ERC20)
        const walletClient = await getWalletClient()
        const sendAmount = parseTokenAmount(amount, 'erc20', 18)

        const hash = await walletClient.writeContract({
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
  }, [
    getWalletClient, 
    context, 
    tokenType,
    tbaAddress, 
    contractAddress, 
    tokenId,
    user, 
    publicClient, 
    fetchTokenBalance, 
    resetModalState
  ])

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
      updateTransactionToast(toastId, 'confirming burn...')

      let txHash: string

      if (context === 'tokenbound') {
        if (!tbaAddress || !user?.wallet?.address) {
          throw new Error('TBA address and user wallet required for tokenbound operations')
        }

        const walletClient = await getWalletClient()
        const tokenboundActions = createTokenboundActions(walletClient, tbaAddress)

        if (tokenType === 'erc20') {
          // For general contracts (ERC20), call burn function like general context
          // Uses V3 TokenboundClient methods: prepareExecution + execute
          const client = createTokenboundClient(walletClient)
          const burnAmount = parseTokenAmount(amount, 'erc20', 18)
          
          const hash = await client.execute({
            account: tbaAddress as `0x${string}`,
            to: contractAddress,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: ZORA_COIN_ABI,
              functionName: 'burn',
              args: [burnAmount]
            })
          })
          txHash = hash
        } else if (tokenType === 'erc1155' && tokenId) {
          // For specific contracts (ERC1155), transfer to proceeds address like specific context
          const result = await tokenboundActions.transferNFT({
            contract_address: contractAddress,
            token_id: tokenId,
            contract: { type: 'ERC1155' },
            chain: 'base'
          } as any, SPECIFIC_CONTRACTS.proceeds, parseInt(amount))
          txHash = result.hash
        } else {
          throw new Error(`Burn operation not supported for ${tokenType} tokens in tokenbound accounts`)
        }
      } else {
        // Standard wallet operation for general context
        const client = await getWalletClient()
        const burnAmount = parseTokenAmount(amount, 'erc20', 18)

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
  }, [getWalletClient, context, contractAddress, tbaAddress, tokenType, tokenId, user, publicClient, fetchTokenBalance, resetModalState])

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
      
      // Determine the correct token type for parsing the sell amount
      // For native ETH, contractAddress will be the ETH placeholder address
      const isSellingEth = sellToken.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
      const sellTokenType = isSellingEth ? 'native' : (tokenType || 'erc20')
      const sellAmount = parseTokenAmount(amount, sellTokenType, 18).toString()

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
  }, [contractAddress, tokenType, tokenSymbol, user, fetchTokenBalance, resetModalState])

  /**
   * Execute ERC1155 buy operation (primary mint with USDC)
   */
  const executeERC1155Buy = useCallback(async (amount: string): Promise<void> => {
    console.log('🔍 executeERC1155Buy called with:', {
      amount,
      tokenId,
      pricePerToken: pricePerToken?.toString(),
      context,
      primaryMintActive
    })
    
    if (!amount || !tokenId || !pricePerToken) {
      console.error('❌ Missing required parameters:', {
        hasAmount: !!amount,
        hasTokenId: !!tokenId,
        hasPricePerToken: !!pricePerToken
      })
      throw new Error('Amount, tokenId, and price required for ERC1155 buy')
    }

    if (!primaryMintActive) {
      throw new Error('This policy is no longer issuing certificates')
    }

    setIsLoading(true)
    const toastId = createTransactionToast('buy')
    setCurrentToast(toastId)

    try {
      const quantity = BigInt(Math.floor(Number(amount)))
      
      // Check supply limits
      if (maxSupply && totalMinted && quantity + totalMinted > maxSupply) {
        throw new Error('Exceeds maximum supply')
      }

      const totalPrice = pricePerToken * quantity
      
      // Check USDC balance
      if (erc1155Balance.usdcBalance < totalPrice) {
        throw new Error('Insufficient USDC balance')
      }

      if (context === 'tokenbound') {
        // Execute through tokenbound account
        if (!tbaAddress) {
          throw new Error('TBA address required for tokenbound operations')
        }

        const walletClient = await getWalletClient()
        const tokenboundClient = createTokenboundClient(walletClient)

        // Check if TBA has approved the minter
        const allowance = await publicClient.readContract({
          address: SPECIFIC_CONTRACTS.usdc,
          abi: [
            {
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' }
              ],
              name: 'allowance',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'allowance',
          args: [tbaAddress, SPECIFIC_CONTRACTS.erc20Minter]
        }) as bigint

        console.log('🔍 TBA USDC approval check:', {
          tbaAddress,
          minter: SPECIFIC_CONTRACTS.erc20Minter,
          currentAllowance: allowance.toString(),
          requiredAmount: totalPrice.toString(),
          needsApproval: allowance < totalPrice
        })

        if (allowance < totalPrice) {
          updateTransactionToast(toastId, 'approving USDC from tokenbound account...')
          
          console.log('🔵 Executing TBA USDC approval...')

          // Approve USDC through tokenbound account
          const approveHash = await tokenboundClient.execute({
            account: tbaAddress,
            to: SPECIFIC_CONTRACTS.usdc,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: [
                {
                  inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  name: 'approve',
                  outputs: [{ type: 'bool' }],
                  stateMutability: 'nonpayable',
                  type: 'function'
                }
              ],
              functionName: 'approve',
              args: [SPECIFIC_CONTRACTS.erc20Minter, maxUint256]
            })
          })

          console.log('🔵 TBA approval transaction sent:', approveHash)
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          console.log('✅ TBA approval confirmed')
          
          // Add delay for network propagation and rate limiting
          console.log('🔵 Waiting for approval to propagate...')
          updateTransactionToast(toastId, 'approval confirmed, preparing mint transaction...')
          await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay for rate limiting
          
          // Verify approval was successful
          const newAllowance = await publicClient.readContract({
            address: SPECIFIC_CONTRACTS.usdc,
            abi: [
              {
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                name: 'allowance',
                outputs: [{ type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'allowance',
            args: [tbaAddress, SPECIFIC_CONTRACTS.erc20Minter]
          }) as bigint
          
          console.log('✅ Verified new allowance:', newAllowance.toString())
        }

        updateTransactionToast(toastId, 'confirming purchase...')

        console.log('🔵 Executing TBA mint transaction:', {
          account: tbaAddress,
          to: SPECIFIC_CONTRACTS.erc20Minter,
          mintTo: tbaAddress,
          quantity: quantity.toString(),
          tokenAddress: contractAddress,
          tokenId: tokenId,
          totalPrice: totalPrice.toString(),
          currency: SPECIFIC_CONTRACTS.usdc,
          mintReferral: SPECIFIC_CONTRACTS.mintReferral
        })

        // Execute mint through tokenbound account
        const hash = await tokenboundClient.execute({
          account: tbaAddress,
          to: SPECIFIC_CONTRACTS.erc20Minter,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: ZORA_ERC20_MINTER_ABI,
            functionName: 'mint',
            args: [
              tbaAddress,                       // mintTo (TBA receives the tokens)
              quantity,                         // quantity
              contractAddress,                  // tokenAddress
              BigInt(tokenId),                  // tokenId
              totalPrice,                       // totalValue
              SPECIFIC_CONTRACTS.usdc,          // currency
              SPECIFIC_CONTRACTS.mintReferral,  // mintReferral
              ''                                // comment
            ]
          })
        })
        
        console.log('🔵 TBA mint transaction sent:', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        console.log('✅ TBA mint confirmed')
        
        successToast(toastId, 'buy', hash)
        await fetchTokenBalance()
        resetModalState()

      } else {
        // Execute through user wallet (specific context)
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        })

        // Check if approval is needed
        const needsApproval = !(await checkUsdcApproval(totalPrice))

        if (needsApproval) {
          updateTransactionToast(toastId, 'approving USDC...')

          // Approve USDC
          const approveHash = await walletClient.writeContract({
            address: SPECIFIC_CONTRACTS.usdc,
            abi: [
              {
                inputs: [
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint256' }
                ],
                name: 'approve',
                outputs: [{ type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ],
            functionName: 'approve',
            args: [SPECIFIC_CONTRACTS.erc20Minter, maxUint256],
            account: user!.wallet!.address as `0x${string}`
          })

          await publicClient.waitForTransactionReceipt({ hash: approveHash })

          updateTransactionToast(toastId, 'USDC approved! Click ENSURE again to mint.', 'success')
          setIsLoading(false)
          setCurrentToast(null)
          return
        }

        // Proceed with mint
        updateTransactionToast(toastId, 'confirming purchase...')

        const hash = await walletClient.writeContract({
          address: SPECIFIC_CONTRACTS.erc20Minter,
          abi: ZORA_ERC20_MINTER_ABI,
          functionName: 'mint',
          args: [
            user!.wallet!.address,        // mintTo
            quantity,                     // quantity
            contractAddress,              // tokenAddress
            BigInt(tokenId),              // tokenId
            totalPrice,                   // totalValue
            SPECIFIC_CONTRACTS.usdc,      // currency
            SPECIFIC_CONTRACTS.mintReferral, // mintReferral
            ''                            // comment
          ],
          chain: base,
          account: user!.wallet!.address as `0x${string}`
        })
        
        await publicClient.waitForTransactionReceipt({ hash })
        
        successToast(toastId, 'buy', hash)
        await fetchTokenBalance()
        resetModalState()
      }
    } catch (error: any) {
      console.error('ERC1155 buy failed:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        cause: error?.cause,
        stack: error?.stack?.split('\n').slice(0, 5)
      })
      
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Buy cancelled')
      } else {
        errorToast(toastId, error, 'Buy failed')
      }
      throw error
    } finally {
      setIsLoading(false)
      setCurrentToast(null)
    }
  }, [context, tbaAddress, tokenId, pricePerToken, primaryMintActive, maxSupply, totalMinted, erc1155Balance.usdcBalance, checkUsdcApproval, contractAddress, user, publicClient, fetchTokenBalance, resetModalState, getWalletClient])

  /**
   * Execute buy operation for non-ERC1155 tokens (general context and tokenbound ERC20/native)
   */
  const executeBuy = useCallback(async (amount: string, selectedToken?: TokenInfo): Promise<void> => {
    if (context === 'tokenbound' && tokenType === 'erc1155') {
      // This should not happen as tokenbound ERC1155 uses executeERC1155Buy
      throw new Error('Use executeERC1155Buy for tokenbound ERC1155 operations')
    }
    
    // For general context and tokenbound ERC20/native, implement basic buy logic
    throw new Error('Buy operation for this context not yet implemented')
  }, [context, tokenType])

  /**
   * Execute ERC1155 burn operation (transfer to proceeds address)
   */
  const executeERC1155Burn = useCallback(async (amount: string): Promise<void> => {
    if (!amount || context !== 'specific' || !tokenId) {
      throw new Error('Amount and ERC1155 context required')
    }

    setIsBurning(true)
    const toastId = createTransactionToast('burn')
    setCurrentToast(toastId)

    try {
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(window.ethereum)
      })

      const tokenAmount = BigInt(Math.floor(Number(amount)))
      
      if (tokenAmount > erc1155Balance.tokenBalance) {
        throw new Error('Insufficient token balance')
      }

      updateTransactionToast(toastId, 'sending to ensurance proceeds...')

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: ZORA_1155_ABI,
        functionName: 'safeTransferFrom',
        args: [
          user!.wallet!.address,
          SPECIFIC_CONTRACTS.proceeds,
          BigInt(tokenId),
          tokenAmount,
          '0x' // No data needed
        ],
        chain: base,
        account: user!.wallet!.address as `0x${string}`
      })
      
      await publicClient.waitForTransactionReceipt({ hash })
      
      updateTransactionToast(toastId, 'certificates sent to ensurance proceeds', 'success')
      await fetchTokenBalance()
      resetModalState()
    } catch (error: any) {
      console.error('ERC1155 burn failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        errorToast(toastId, 'Transaction cancelled', 'Burn cancelled')
      } else {
        errorToast(toastId, error, 'Burn failed')
      }
      throw error
    } finally {
      setIsBurning(false)
      setCurrentToast(null)
    }
  }, [context, tokenId, erc1155Balance.tokenBalance, contractAddress, user, publicClient, fetchTokenBalance, resetModalState])

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

    // ERC1155 specific state
    erc1155Balance,
    usdcBalance,
    setErc1155Balance,
    
    // ERC1155 specific functions
    getUsdcOperationData,
    checkUsdcApproval,

    // Actions
    setAccountSearchQuery,
    fetchAvailableTokens,
    fetchTokenBalance,
    resetModalState,
    handleAmountChange,
    handleTokenSelect,
    handleAccountSelect,
    handleSearchQueryChange,
    executeBuy,
    executeSend,
    executeBurn,
    executeSwap: executeTokenSwap,
    
    // ERC1155 specific actions
    executeERC1155Buy,
    executeERC1155Burn,

    validateAmount: (amount: string, balance: string | bigint, decimals: number) => 
      validateAmount(amount, balance, 'erc20', decimals),

    // Auth
    login,
    authenticated,
    userAddress: user?.wallet?.address
  }
}
