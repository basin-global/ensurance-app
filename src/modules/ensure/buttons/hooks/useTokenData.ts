import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useDebounce } from '@/hooks/useDebounce'
import { 
  createPublicClient,
  http,
  type Address
} from 'viem'
import { base } from 'viem/chains'
import type { 
  ButtonContext, 
  TokenInfo, 
  AccountSearchResult, 
  TokenType,
  ERC1155BalanceInfo
} from '../types'
import { batchFetchTokenImages } from '../utils/images'
import { formatTokenBalance, formatNumber } from '../utils/formatting'

interface UseTokenDataProps {
  context: ButtonContext
  contractAddress: Address
  tokenId?: string
  tokenType?: TokenType
  tbaAddress?: Address
  skipBalance?: boolean
}

export const useTokenData = ({
  context,
  contractAddress,
  tokenId,
  tokenType = 'erc20',
  tbaAddress,
  skipBalance = false
}: UseTokenDataProps) => {
  const { authenticated, user } = usePrivy()
  
  // Data state
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  
  // Quote state
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0')
  const [isSimulating, setIsSimulating] = useState(false)
  
  // Account search state
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300)
  
  // ERC1155 specific state
  const [erc1155Balance, setErc1155Balance] = useState<ERC1155BalanceInfo>({
    tokenBalance: BigInt(0),
    usdcBalance: BigInt(0),
    formattedTokenBalance: '0',
    formattedUsdcBalance: '0.00'
  })

  // Create public client
  const publicClient = useMemo(() => createPublicClient({
    chain: base,
    transport: http()
  }), [])

  /**
   * Fetch token balance based on context and token type
   */
  const fetchTokenBalance = useCallback(async () => {
    if (!user?.wallet?.address) return
    
    // Determine which address to query
    const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address

    try {
      if ((tokenType as string) === 'erc1155') {
        // Fetch ERC1155 balance and USDC balance
        const [tokenBalance, usdcBalance] = await Promise.all([
          // Token balance
          publicClient.readContract({
            address: contractAddress,
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
          }),
          // USDC balance
          publicClient.readContract({
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
        ])

        const formattedTokenBalance = (tokenBalance as bigint).toString()
        const formattedUsdcBalance = (Number(usdcBalance as bigint) / 1_000_000).toFixed(6)

        setErc1155Balance({
          tokenBalance: tokenBalance as bigint,
          usdcBalance: usdcBalance as bigint,
          formattedTokenBalance,
          formattedUsdcBalance
        })
        
        setTokenBalance(tokenBalance as bigint)
      } else if ((tokenType as string) === 'native') {
        // Fetch native ETH balance
        const balance = await publicClient.getBalance({
          address: addressToQuery as Address
        })
        setTokenBalance(balance)
      } else if ((tokenType as string) === 'erc20') {
        // Fetch ERC20 balance
        const balance = await publicClient.readContract({
          address: contractAddress,
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
  }, [context, contractAddress, tokenId, tokenType, tbaAddress, user?.wallet?.address, publicClient])

  /**
   * Fetch available tokens for trading
   */
  const fetchAvailableTokens = useCallback(async (operation: 'buy' | 'swap') => {
    if (!authenticated || !user?.wallet?.address) return

    setIsLoadingTokens(true)
    try {
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

      // Get balances for the appropriate address
      const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address
      const alchemyRes = await fetch(`/api/alchemy/fungible?address=${addressToQuery}`)
      if (!alchemyRes.ok) throw new Error('Failed to fetch wallet balances')
      
      const alchemyData = await alchemyRes.json()
      
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

          const balanceA = formatTokenBalance(a.balance, a.decimals)
          const balanceB = formatTokenBalance(b.balance, b.decimals)
          return balanceB - balanceA
        })

      setAvailableTokens(tokens)
    } catch (error) {
      console.error('Error fetching tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }, [authenticated, user?.wallet?.address, contractAddress, context, tbaAddress])

  /**
   * Get price quote from 0x API
   */
  const fetchQuote = useCallback(async (
    sellToken: string,
    buyToken: string, 
    sellAmount: string
  ) => {
    if (!user?.wallet?.address || !sellAmount || Number(sellAmount) <= 0) {
      setEstimatedOutput('0')
      return
    }

    // Determine which address to use as taker (same logic as fetchTokenBalance)
    const takerAddress = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address

    setIsSimulating(true)
    try {
      const params = new URLSearchParams({
        action: 'quote',
        sellToken,
        buyToken,
        sellAmount,
        taker: takerAddress,
        slippageBps: '200', // 2% slippage
        swapFeeBps: '100'   // 1% fee
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
      
      // Format the output amount
      const outputDecimals = 18 // Assume 18 decimals for target tokens
      const amount = Number(data.buyAmount) / Math.pow(10, outputDecimals)
      const formattedAmount = formatNumber(amount, outputDecimals)
      setEstimatedOutput(formattedAmount)
    } catch (error) {
      console.error('Error getting quote:', error)
      setEstimatedOutput('0')
    } finally {
      setIsSimulating(false)
    }
  }, [user?.wallet?.address, context, tbaAddress])

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

  // Effect for token image fetching
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

  // Fetch balance on mount and when user changes (unless skipBalance is true)
  useEffect(() => {
    if (authenticated && user?.wallet?.address && !skipBalance) {
      fetchTokenBalance()
    }
  }, [authenticated, user?.wallet?.address, skipBalance, fetchTokenBalance])

  return {
    // Data
    tokenBalance,
    availableTokens,
    isLoadingTokens,
    tokenImages,
    estimatedOutput,
    isSimulating,
    accountSearchResults,
    isSearching,
    erc1155Balance,
    
    // Actions
    fetchTokenBalance,
    fetchAvailableTokens,
    fetchQuote,
    searchAccounts,
    setAccountSearchQuery: (query: string) => setAccountSearchQuery(query),
    
    // Auth
    authenticated,
    userAddress: user?.wallet?.address
  }
} 