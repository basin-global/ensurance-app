'use client'

import { PlusCircle, RefreshCw, Flame, ChevronDown } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useGeneralService } from '@/modules/general/service/hooks'
import { useState, useEffect } from 'react'
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
import { SUPPORTED_TOKENS } from '@/modules/specific/config/ERC20'
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'

interface Token {
  symbol: string
  address: Address
  decimals: number
  balance?: string
  type?: 'native' | 'currency' | 'certificate'
}

interface EnsureButtons0xProps {
  contractAddress: Address
  showMinus?: boolean
  showBurn?: boolean
  size?: 'sm' | 'lg'
  imageUrl?: string
}

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// Add standard ERC20 approve ABI
const ERC20_APPROVE_ABI = [{
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  name: 'approve',
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const

export function EnsureButtons0x({ 
  contractAddress,
  showMinus = true,
  showBurn = false,
  size = 'lg',
  imageUrl = '/assets/no-image-found.png'
}: EnsureButtons0xProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { userAddress } = useGeneralService()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'burn'>('buy')
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [tokenSymbol, setTokenSymbol] = useState<string>('')
  const debouncedAmount = useDebounce(amount, 500)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [amountError, setAmountError] = useState<string>('')

  // Add effect to fetch token details
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!contractAddress) return
      
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })

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
  }, [contractAddress])

  // Add effect to fetch token balance when needed
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!authenticated || !userAddress || !contractAddress) return
      
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
        console.error('Error fetching token balance:', error)
      }
    }

    fetchTokenBalance()
  }, [authenticated, userAddress, contractAddress, modalOpen])

  const handleOpenModal = async (type: 'buy' | 'sell' | 'burn') => {
    if (!authenticated) {
      login()
      return
    }
    
    setTradeType(type)
    setModalOpen(true)
    
    // For burn, set the amount to the current balance
    if (type === 'burn') {
      setAmount(formatEther(tokenBalance))
      setFormattedAmount(formatEther(tokenBalance))
    }
    
    // Load available tokens for buy/transform
    if ((type === 'buy' || type === 'sell') && authenticated && userAddress) {
      setIsLoadingTokens(true)
      try {
        // For transform, fetch currencies and certificates
        if (type === 'sell') {
          const [currenciesRes, certificatesRes] = await Promise.all([
            fetch('/api/currencies'),
            fetch('/api/general')
          ])

          if (!currenciesRes.ok || !certificatesRes.ok) {
            throw new Error('Failed to fetch tokens')
          }

          const [currencies, certificates] = await Promise.all([
            currenciesRes.json(),
            certificatesRes.json()
          ])

          // Combine all tokens
          const tokens: Token[] = [
            // Add native ETH
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
              type: 'currency'
            })),
            // Add certificates
            ...certificates.map((c: any) => ({
              symbol: c.symbol,
              address: c.contract_address as Address,
              decimals: 18, // Certificates are always 18 decimals
              type: 'certificate'
            }))
          ]

          setAvailableTokens(tokens)
          
          // Set initial selected token to ETH
          setSelectedToken(tokens[0])
        } else {
          // For buy, fetch user's tokens
          const response = await fetch(`/api/alchemy/fungible?address=${userAddress}`)
          if (!response.ok) throw new Error('Failed to fetch tokens')
          
          const data = await response.json()
          // Map Alchemy response to our token format
          const tokens = data.data.tokens
            .filter((t: any) => t.tokenMetadata?.decimals != null && t.tokenMetadata?.symbol)
            .map((t: any) => ({
              symbol: t.tokenMetadata.symbol,
              address: t.tokenAddress as Address,
              decimals: t.tokenMetadata.decimals,
              balance: t.tokenBalance
            }))
          
          setAvailableTokens(tokens)
        }
      } catch (error) {
        console.error('Error fetching tokens:', error)
        toast.error('Failed to load available tokens')
      } finally {
        setIsLoadingTokens(false)
      }
    }
  }

  // Add validation for amount against balance
  const validateAmount = (value: string) => {
    if (!value) {
      setAmountError('')
      return
    }
    
    try {
      const inputAmount = parseEther(value)
      if (inputAmount > tokenBalance) {
        setAmountError('Insufficient balance')
      } else {
        setAmountError('')
      }
    } catch (error) {
      setAmountError('Invalid amount')
    }
  }

  // Modify handleAmountChange to format with commas while typing
  const handleAmountChange = (value: string) => {
    // Remove existing commas first
    const withoutCommas = value.replace(/,/g, '')
    
    // Only allow numbers and one decimal point
    const cleanValue = withoutCommas.replace(/[^\d.]/g, '')
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length
    if (decimalCount > 1) return

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
  const getTokenDecimals = (token: Token | null) => {
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
      if (!authenticated || !selectedToken || !debouncedAmount || !userAddress) return
      
      setIsSimulating(true)
      try {
        const sellAmountWei = parseEther(debouncedAmount).toString()
        console.log('Preparing quote request:', {
          tradeType,
          sellToken: tradeType === 'buy' ? selectedToken.address : contractAddress,
          buyToken: tradeType === 'buy' ? contractAddress : selectedToken.address,
          sellAmount: sellAmountWei,
          taker: userAddress
        })

        const params = new URLSearchParams({
          action: 'quote',
          sellToken: tradeType === 'buy' ? selectedToken.address : contractAddress,
          buyToken: tradeType === 'buy' ? contractAddress : selectedToken.address,
          sellAmount: sellAmountWei,
          taker: userAddress,
          swapFeeToken: tradeType === 'buy' ? selectedToken.address : contractAddress
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
          const decimals = tradeType === 'buy' ? 18 : getTokenDecimals(selectedToken)
          
          // Convert to proper decimal representation
          const rawAmount = BigInt(data.buyAmount)
          const amount = Number(rawAmount) / Math.pow(10, decimals)
          
          console.log('Raw amount:', rawAmount.toString())
          console.log('Decimals:', decimals)
          console.log('Converted amount:', amount)
          
          // Format the amount based on size and token type
          let formattedAmount
          if (selectedToken.symbol === 'USDC' && tradeType !== 'buy') {
            formattedAmount = amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })
          } else if (amount < 0.000001) {
            formattedAmount = amount.toExponential(6)
          } else if (amount < 1) {
            formattedAmount = amount.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6
            })
          } else if (amount < 1000) {
            formattedAmount = amount.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4
            })
          } else {
            formattedAmount = amount.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })
          }
          
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
    }

    getQuote()
  }, [debouncedAmount, selectedToken, authenticated, userAddress, contractAddress, tradeType])

  // Add a useEffect to monitor estimatedOutput changes
  useEffect(() => {
    console.log('estimatedOutput changed:', estimatedOutput)
  }, [estimatedOutput])

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
      
      // Create public client for reading
      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })

      // Create wallet client
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider)
      })

      if (tradeType === 'burn') {
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

        // Convert amount to wei based on the selling token's decimals
        const sellTokenDecimals = tradeType === 'buy' ? 
          getTokenDecimals(selectedToken) : 18 // Our token is always 18 decimals
        const sellAmountRaw = tradeType === 'buy' ? 
          amount : 
          amount.replace(/,/g, '') // Remove commas for parsing
        const sellAmountWei = (sellTokenDecimals === 18) ?
          parseEther(sellAmountRaw).toString() :
          (BigInt(Math.floor(Number(sellAmountRaw) * Math.pow(10, sellTokenDecimals)))).toString()

        const sellTokenAddress = tradeType === 'buy' ? selectedToken.address : contractAddress

        // 1. Get initial quote
        const params = new URLSearchParams({
          action: 'quote',
          sellToken: sellTokenAddress,
          buyToken: tradeType === 'buy' ? contractAddress : selectedToken.address,
          sellAmount: sellAmountWei,
          taker: userAddress,
          swapFeeToken: sellTokenAddress
        })

        const quoteResponse = await fetch(`/api/0x?${params}`)
        if (!quoteResponse.ok) {
          const errorData = await quoteResponse.json()
          console.error('Quote error details:', errorData)
          
          toast.dismiss(pendingToast)
          // Handle v2 API error structure
          const details = errorData.details || {}
          if (details.validationErrors?.length > 0) {
            toast.error(`Invalid trade parameters: ${details.validationErrors[0]}`)
          } else if (details.code === 'INSUFFICIENT_LIQUIDITY') {
            toast.error('Insufficient liquidity for this trade.')
          } else if (details.code === 'INVALID_TOKEN') {
            toast.error('One or more tokens are not supported.')
          } else if (details.code === 'INSUFFICIENT_BALANCE') {
            toast.error('Insufficient balance for this trade.')
          } else {
            toast.error(details.message || errorData.error || 'Failed to get quote')
          }
          return
        }

        const quoteData = await quoteResponse.json()
        console.log('Trade quote data:', quoteData)

        // Handle permit signing and execute transaction
        if (!quoteData.permit2?.eip712) {
          toast.dismiss(pendingToast)
          throw new Error('Missing permit data in quote response')
        }

        const { types, domain, message } = quoteData.permit2.eip712
        
        console.log('Signing permit with exact data from API:', {
          types,
          domain,
          primaryType: 'PermitTransferFrom',
          message
        })

        toast.update(pendingToast, {
          render: 'Please sign the permit...',
          type: 'info',
          isLoading: true
        })

        try {
          // Get signature from wallet
          const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [
              userAddress,
              JSON.stringify({
                types,
                domain,
                primaryType: 'PermitTransferFrom',
                message
              })
            ]
          })

          console.log('Raw signature received:', signature)

          // Add a small delay to let MetaMask UI reset
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Format signature according to 0x specification
          const signatureLength = 65
          const signatureLengthInHex = numberToHex(signatureLength, {
            size: 32,
            signed: false,
          })

          // Combine transaction data with signature
          const finalTxData = concat([
            quoteData.transaction.data,
            signatureLengthInHex,
            signature
          ])

          // Execute the trade
          toast.update(pendingToast, {
            render: 'confirm the transaction...',
            type: 'info',
            isLoading: true
          })

          // Add another small delay before transaction
          await new Promise(resolve => setTimeout(resolve, 500))

          // Check if we're transforming to ETH or ERC20
          const isToEth = isEthAddress(selectedToken.address)
          console.log('Transform target:', {
            address: selectedToken.address,
            isEth: isToEth,
            symbol: selectedToken.symbol
          })

          const tx = {
            from: userAddress,
            to: quoteData.transaction.to,
            data: finalTxData,
            value: quoteData.transaction.value === '0' ? '0x0' : `0x${BigInt(quoteData.transaction.value).toString(16)}`,
            gas: `0x${BigInt(quoteData.transaction.gas).toString(16)}`,
            gasPrice: quoteData.transaction.gasPrice ? `0x${BigInt(quoteData.transaction.gasPrice).toString(16)}` : undefined
          }

          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [tx]
          })

          await publicClient.waitForTransactionReceipt({ hash: txHash })
          
          toast.update(pendingToast, {
            render: tradeType === 'buy' 
              ? 'success! you have ensured what matters'
              : `success! ${tokenSymbol} transformed to ${isToEth ? 'ETH' : selectedToken.symbol}`,
            type: 'success',
            isLoading: false,
            autoClose: 5000
          })

          setModalOpen(false)
        } catch (error: any) {
          console.error('Transaction failed:', error)
          if (error?.code === 4001 || error?.message?.includes('rejected')) {
            toast.dismiss(pendingToast)
            toast.error('Transaction cancelled')
          } else {
            toast.update(pendingToast, {
              render: error?.message || 'Transaction failed',
              type: 'error',
              isLoading: false,
              autoClose: 5000
            })
          }
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

  // Format balance with appropriate decimals
  const formatBalance = (balance: bigint) => {
    if (balance === BigInt(0)) return '0'
    
    const formatted = formatEther(balance)
    const num = Number(formatted)
    
    if (num < 1) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      })
    } else {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }
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
      </div>

      {/* Add balance display */}
      <div className="mt-2 text-sm text-gray-400 text-center">
        balance: {formatBalance(tokenBalance)} {tokenSymbol}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {tradeType === 'buy' ? 'ensure' : tradeType === 'sell' ? 'transform' : 'burn'}
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenSymbol || 'Token'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
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
                    setTradeType('buy')
                    setAmount('')
                    setFormattedAmount('')
                  }}
                  className="bg-green-600 hover:bg-green-500"
                >
                  ENSURE NOW
                </Button>
              </div>
            ) : tradeType === 'burn' ? (
              // Burn UI
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    quantity to burn
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setFormattedAmount(e.target.value)
                      }}
                      placeholder="enter amount"
                      className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium w-36"
                      min="0"
                      step={Number(tokenBalance) < 1 ? "0.000001" : "0.01"}
                    />
                  </div>
                  <div className="text-sm text-gray-400 whitespace-nowrap">
                    your balance: {formatBalance(tokenBalance)}
                  </div>
                </div>
              </div>
            ) : tradeType === 'sell' ? (
              // Un-ensure (Sell) UI
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    quantity to transform
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={formattedAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="enter amount"
                      className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium w-36 ${
                        amountError ? 'border-red-500' : ''
                      }`}
                      min="0"
                      step={Number(tokenBalance) < 1 ? "0.000001" : "0.01"}
                    />
                  </div>
                  {amountError && (
                    <div className="text-sm text-red-500">
                      {amountError}
                    </div>
                  )}
                  <div className="text-sm text-gray-400 whitespace-nowrap">
                    your balance: {formatBalance(tokenBalance)}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    transform to
                  </label>
                  <Select
                    value={selectedToken?.address}
                    onValueChange={(value) => {
                      const token = availableTokens.find(t => t.address === value)
                      if (token) {
                        setSelectedToken(token)
                        // Don't reset amount anymore
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select token"} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border border-gray-800">
                      {isLoadingTokens ? (
                        <SelectItem value="loading" disabled>
                          Loading tokens...
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem 
                            value="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                            className="hover:bg-gray-800"
                          >
                            ETH
                          </SelectItem>
                          
                          {availableTokens
                            .filter(t => t.type === 'currency')
                            .map(token => (
                              <SelectItem 
                                key={token.address} 
                                value={token.address}
                                className="hover:bg-gray-800"
                              >
                                {token.symbol}
                              </SelectItem>
                            ))
                          }
                          
                          {availableTokens
                            .filter(t => t.type === 'certificate')
                            .map(token => (
                              <SelectItem 
                                key={token.address} 
                                value={token.address}
                                className="hover:bg-gray-800"
                              >
                                {token.symbol}
                              </SelectItem>
                            ))
                          }
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  <div className="text-sm text-gray-400">
                    estimated: {isSimulating ? 'calculating...' : (
                      selectedToken?.symbol === 'USDC' 
                        ? Number(estimatedOutput).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : selectedToken?.symbol === 'ETH' || selectedToken?.symbol === 'WETH'
                          ? Number(estimatedOutput).toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6
                            })
                          : estimatedOutput // Already formatted in getQuote
                    )} {selectedToken?.symbol || 'tokens'}
                  </div>
                </div>
              </div>
            ) : (
              // Buy UI
              <div className="space-y-6">
                {/* Token Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    {tradeType === 'buy' ? 'buy with' : 'receive'}
                  </label>
                  <Select
                    value={selectedToken?.address}
                    onValueChange={(value) => {
                      const token = tradeType === 'buy' 
                        ? availableTokens.find(t => t.address === value)
                        : Object.values(SUPPORTED_TOKENS).find(t => t.address === value)
                      if (token) {
                        setSelectedToken(token)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border border-gray-800">
                      {(tradeType === 'buy' ? availableTokens : Object.values(SUPPORTED_TOKENS))
                        .filter(token => {
                          if (tradeType !== 'buy') return true;
                          if (!('balance' in token)) return false;
                          const balance = Number(formatEther(BigInt(token.balance)))
                          return balance >= 0.000001;
                        })
                        .sort((a, b) => {
                          if (tradeType !== 'buy') return 0;
                          const balanceA = 'balance' in a ? Number(formatEther(BigInt(a.balance))) : 0
                          const balanceB = 'balance' in b ? Number(formatEther(BigInt(b.balance))) : 0
                          return balanceB - balanceA
                        })
                        .map((token) => {
                          let displayBalance = ''
                          if ('balance' in token && token.balance) {
                            const balance = Number(formatEther(BigInt(token.balance)))
                            if (balance >= 1) {
                              displayBalance = balance.toLocaleString('en-US', { maximumFractionDigits: 0 })
                            } else if (balance >= 0.000001) {
                              displayBalance = balance.toFixed(6)
                            }
                          }
                          
                          return (
                            <SelectItem 
                              key={token.address} 
                              value={token.address}
                              className="hover:bg-gray-800"
                            >
                              <div className="flex justify-between items-center w-full gap-4">
                                <span className="font-medium">{token.symbol}</span>
                                {displayBalance && (
                                  <span className="text-gray-400 text-sm">{displayBalance}</span>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    {tradeType === 'buy' ? 'quantity' : 'quantity to receive'}
                  </label>
                  <Input
                    type="text"
                    value={formattedAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="bg-gray-900/50 border-gray-800 text-white"
                    placeholder="0.0"
                  />
                </div>

                {/* Estimated Output */}
                <div className="space-y-5">
                  <div className="text-sm font-medium text-gray-300 text-right">
                    estimated {tokenSymbol?.toLowerCase() || 'tokens'}
                  </div>
                  <div className="text-2xl font-medium text-white text-right">
                    {isSimulating ? 'calculating...' : estimatedOutput}
                  </div>
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
              disabled={isLoading || (tradeType === 'burn' ? !amount || Number(amount) <= 0 : !selectedToken || !amount || Number(amount) <= 0)}
              className={`min-w-[120px] ${
                tradeType === 'buy' 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : tradeType === 'sell'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-orange-600 hover:bg-orange-500'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                tradeType === 'buy' ? 'ENSURE' : tradeType === 'sell' ? 'TRANSFORM' : 'BURN'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
