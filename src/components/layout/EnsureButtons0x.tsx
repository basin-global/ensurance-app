'use client'

import { PlusCircle, MinusCircle, Flame, ChevronDown } from 'lucide-react'
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
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'

interface Token {
  symbol: string
  address: Address
  decimals: number
  balance?: string
}

interface EnsureButtons0xProps {
  contractAddress: Address
  showMinus?: boolean
  showBurn?: boolean
  size?: 'sm' | 'lg'
  imageUrl?: string
}

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

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
  const debouncedAmount = useDebounce(amount, 500)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  // Handle amount input with comma formatting
  const handleAmountChange = (value: string) => {
    // Remove commas and non-numeric characters except decimal point
    const cleanValue = value.replace(/,/g, '').replace(/[^\d.]/g, '')
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length
    if (decimalCount > 1) return

    setAmount(cleanValue)

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

  // Get quote when amount or selected token changes
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
            toast.error(details.message || errorData.error || 'Failed to get quote');
          }
          return
        }
        
        const data = await response.json()
        console.log('Quote response:', data)
        
        // Handle v2 API response format
        if (data.buyAmount) {
          const formattedAmount = Number(formatEther(BigInt(data.buyAmount)))
            .toLocaleString('en-US', { 
              maximumFractionDigits: 0,
              minimumFractionDigits: 0 
            })
          setEstimatedOutput(formattedAmount)
        } else {
          console.error('Unexpected quote response format:', data)
          toast.error('Received invalid quote response')
        }
      } catch (error) {
        console.error('Error getting quote:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to get price quote')
      } finally {
        setIsSimulating(false)
      }
    }

    getQuote()
  }, [debouncedAmount, selectedToken, authenticated, userAddress, contractAddress, tradeType])

  const handleOpenModal = async (type: 'buy' | 'sell' | 'burn') => {
    if (!authenticated) {
      login()
      return
    }
    
    setTradeType(type)
    setModalOpen(true)
    
    // Load available tokens for buy
    if (type === 'buy' && authenticated && userAddress) {
      try {
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
      } catch (error) {
        console.error('Error fetching tokens:', error)
        toast.error('Failed to load available tokens')
      }
    }
    
    // Set initial token selection for sell
    if (type === 'sell') {
      const usdc = SUPPORTED_TOKENS.USDC
      setSelectedToken({
        symbol: usdc.symbol,
        address: usdc.address,
        decimals: usdc.decimals
      })
    }
  }

  const handleApproval = async (
    provider: any,
    sellTokenAddress: Address,
    pendingToast: any
  ): Promise<boolean> => {
    try {
      setIsApproving(true)
      
      const approvalTx = {
        from: userAddress,
        to: sellTokenAddress,
        data: encodeFunctionData({
          abi: [{
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: 'success', type: 'bool' }]
          }],
          functionName: 'approve',
          args: [PERMIT2_ADDRESS, maxUint256]
        })
      }

      toast.update(pendingToast, {
        render: 'Approving Permit2 access (one-time approval)...',
        type: 'info',
        isLoading: true
      })

      const approvalHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [approvalTx]
      })

      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })

      await publicClient.waitForTransactionReceipt({ hash: approvalHash })
      console.log('Permit2 approved with unlimited allowance')
      return true
    } catch (error) {
      console.error('Approval failed:', error)
      toast.update(pendingToast, {
        render: error instanceof Error ? error.message : 'Failed to approve tokens',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      })
      return false
    } finally {
      setIsApproving(false)
    }
  }

  const handleTrade = async () => {
    if (!authenticated || !selectedToken || !userAddress) {
      login()
      return
    }

    const pendingToast = toast.loading('Preparing transaction...')
    
    try {
      setIsLoading(true)
      const activeWallet = wallets[0]
      if (!activeWallet) {
        toast.error('No wallet connected')
        return
      }

      const provider = await activeWallet.getEthereumProvider()
      const sellAmountWei = parseEther(amount).toString()
      const sellTokenAddress = tradeType === 'buy' ? selectedToken.address : contractAddress

      // Create public client for transaction monitoring
      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })

      // 1. Get initial quote
      const params = new URLSearchParams({
        action: 'quote',
        sellToken: sellTokenAddress,
        buyToken: tradeType === 'buy' ? contractAddress : selectedToken.address,
        sellAmount: sellAmountWei,
        taker: userAddress,
        swapFeeToken: sellTokenAddress
      })

      let quoteResponse = await fetch(`/api/0x?${params}`)
      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json()
        console.error('Quote error details:', errorData)
        
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

      let quoteData = await quoteResponse.json()
      console.log('Trade quote data:', quoteData)

      // 2. Handle approval if needed (one-time unlimited approval)
      if (quoteData.issues?.allowance?.actual === '0') {
        const approved = await handleApproval(provider, sellTokenAddress, pendingToast)
        if (!approved) return

        // Get fresh quote after approval
        const newQuoteResponse = await fetch(`/api/0x?${params}`)
        if (!newQuoteResponse.ok) {
          throw new Error('Failed to get updated quote')
        }
        quoteData = await newQuoteResponse.json()
        console.log('Updated quote after approval:', quoteData)
      }

      // 3. Handle permit signing and transaction
      if (!quoteData.permit2?.eip712) {
        throw new Error('Missing permit data in quote response')
      }

      const { types, domain, message } = quoteData.permit2.eip712
      
      console.log('Signing permit with exact data from API:', {
        types,
        domain,
        primaryType: 'PermitTransferFrom',
        message
      })

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

      // Format signature according to 0x specification
      // Signature is 65 bytes (130 hex chars without 0x prefix)
      const signatureLength = 65
      const signatureLengthInHex = numberToHex(signatureLength, {
        size: 32,
        signed: false,
      })

      console.log('Signature formatting:', {
        rawSignature: signature,
        signatureLength,
        signatureLengthInHex
      })

      // Combine transaction data with signature length and signature
      const finalTxData = concat([
        quoteData.transaction.data,
        signatureLengthInHex,
        signature
      ])

      console.log('Transaction data components:', {
        originalData: quoteData.transaction.data,
        signatureLengthInHex,
        signature,
        finalData: finalTxData
      })

      // Execute the trade with properly formatted data
      const tx = {
        from: userAddress,
        to: quoteData.transaction.to,
        data: finalTxData,
        value: quoteData.transaction.value === '0' ? '0x0' : `0x${BigInt(quoteData.transaction.value).toString(16)}`,
        gas: `0x${BigInt(quoteData.transaction.gas).toString(16)}`,
        gasPrice: quoteData.transaction.gasPrice ? `0x${BigInt(quoteData.transaction.gasPrice).toString(16)}` : undefined
      }

      console.log('Final transaction:', tx)
      
      toast.update(pendingToast, {
        render: 'Waiting for wallet confirmation...',
        type: 'info',
        isLoading: true
      })

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })

      console.log('Transaction submitted:', txHash)
      
      toast.update(pendingToast, {
        render: 'Transaction submitted! Waiting for confirmation...',
        type: 'info',
        isLoading: true
      })

      // Wait for transaction confirmation using publicClient
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      
      if (receipt.status === 'success') {
        toast.update(pendingToast, {
          render: 'Transaction successful!',
          type: 'success',
          isLoading: false,
          autoClose: 5000
        })
      } else {
        toast.update(pendingToast, {
          render: 'Transaction failed on-chain. Check block explorer for details.',
          type: 'error',
          isLoading: false,
          autoClose: 5000
        })
      }

      setModalOpen(false)
    } catch (error: any) {
      console.error('Trade failed:', error)
      toast.update(pendingToast, {
        render: error?.message || 'Failed to execute trade',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

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
              <p>ensure with 0x (buy)</p>
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
                  <MinusCircle className={`${iconSize} stroke-[1.5] stroke-red-500 hover:stroke-red-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>un-ensure with 0x (sell)</p>
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
                <p>burn tokens</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-white">
                {tradeType === 'buy' ? 'ensure' : tradeType === 'sell' ? 'un-ensure' : 'burn'} with 0x
              </DialogTitle>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image 
                  src={imageUrl}
                  alt="Token"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* Token Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                {tradeType === 'buy' ? 'Pay with' : 'Receive'}
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
                      // Only filter out small balances for buy tokens (availableTokens)
                      if (tradeType !== 'buy') return true;
                      // Type guard to ensure we're working with a Token that has balance
                      if (!('balance' in token)) return false;
                      const balance = Number(formatEther(BigInt(token.balance)))
                      return balance >= 0.000001;
                    })
                    .sort((a, b) => {
                      // Only sort by balance for buy tokens
                      if (tradeType !== 'buy') return 0;
                      // Type guard for balance property
                      const balanceA = 'balance' in a ? Number(formatEther(BigInt(a.balance))) : 0
                      const balanceB = 'balance' in b ? Number(formatEther(BigInt(b.balance))) : 0
                      return balanceB - balanceA
                    })
                    .map((token) => {
                      // Format balance
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
                Amount
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
            {tradeType !== 'burn' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  Estimated {tradeType === 'buy' ? 'tokens' : 'receive amount'}
                </label>
                <div className="text-xl font-medium text-white">
                  {isSimulating ? 'Calculating...' : estimatedOutput}
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
              disabled={isLoading || !selectedToken || Number(amount) <= 0}
              className={`min-w-[120px] ${
                tradeType === 'buy' 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : tradeType === 'sell'
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-orange-600 hover:bg-orange-500'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                tradeType === 'buy' ? 'ENSURE' : tradeType === 'sell' ? 'UN-ENSURE' : 'BURN'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
