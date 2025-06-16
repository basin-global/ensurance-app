'use client'

import { PlusCircle, RefreshCw, Flame, ExternalLink, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { 
  type Address,
  createWalletClient,
  custom,
  http,
  createPublicClient,
  type PublicClient,
  type WalletClient,
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
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { toast } from 'react-toastify'
import ZORA_1155_ABI from '@/abi/Zora1155proxy.json'
import ZORA_ERC20_MINTER_ABI from '@/abi/ZoraERC20Minter.json'
import { mintToken } from '@/modules/specific/collect'
import { formatUsdcAmount, parseUsdcAmount, SUPPORTED_TOKENS, CONTRACTS, PERMIT2_ADDRESS } from '@/modules/specific/config'
import AccountImage from '@/modules/accounts/AccountImage'
import { useDebounce } from '@/hooks/useDebounce'

interface EnsureButtonsSpecificProps {
  contractAddress: Address
  tokenId: bigint
  showMinus?: boolean
  showBurn?: boolean
  size?: 'sm' | 'lg'
  imageUrl?: string
  showBalance?: boolean
  tokenName?: string
  tokenSymbol?: string
  maxSupply?: bigint
  totalMinted?: bigint
  pricePerToken?: bigint
  primaryMintActive?: boolean
}

interface AccountSearchResult {
  name: string
  path: string
  type: 'account'
  is_agent: boolean
  is_ensurance: boolean
  token_id: number
}

type TradeType = 'buy' | 'sell' | 'burn' | 'send'

const PROCEEDS_ADDRESS = '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e' as `0x${string}`

// Add helper function for truncating addresses
const truncateAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function EnsureButtonsSpecific({ 
  contractAddress,
  tokenId,
  showMinus = true,
  showBurn = false,
  size = 'lg',
  imageUrl = '/assets/no-image-found.png',
  showBalance = true,
  tokenName,
  tokenSymbol = 'TOKEN',
  maxSupply,
  totalMinted,
  pricePerToken,
  primaryMintActive = false
}: EnsureButtonsSpecificProps) {
  const { login, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [burnModalOpen, setBurnModalOpen] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<TradeType>('buy')
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState<string>('')
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0))
  const [sendRecipient, setSendRecipient] = useState('')
  const [sendRecipientError, setSendRecipientError] = useState('')
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null)
  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300)

  // Create a single publicClient instance
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  // Function to fetch balances
  const fetchBalances = async () => {
    try {
      const activeWallet = user?.wallet
      if (!activeWallet?.address) return

      // Fetch token balance
      const tokenBalance = await publicClient.readContract({
        address: contractAddress,
        abi: ZORA_1155_ABI,
        functionName: 'balanceOf',
        args: [activeWallet.address, tokenId]
      }) as bigint
      setTokenBalance(tokenBalance)

      // Fetch USDC balance
      const usdcBalance = await publicClient.readContract({
        address: CONTRACTS.usdc,
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
        args: [activeWallet.address as `0x${string}`]
      }) as bigint
      setUsdcBalance(usdcBalance)
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }

  // Fetch balances on mount and when wallet changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchBalances()
    }
  }, [authenticated, user?.wallet?.address])

  // Add account search effect
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
          setSendRecipient(data.tba_address)
        }
      } catch (error) {
        console.error('Error fetching account details:', error)
        toast.error('Failed to fetch account details')
      }
    }

    fetchAccountDetails()
  }, [selectedAccount])

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  const handleOpenModal = (type: TradeType) => {
    if (!authenticated) {
      login()
      return
    }

    if (type === 'buy' && !primaryMintActive) {
      toast.error('This policy is no longer issuing certificates')
      return
    }

    // Reset states
    setAmount('')
    setFormattedAmount('')
    setAmountError('')
    setTradeType(type)
    setSendRecipient('')
    setSendRecipientError('')

    // Fetch balances when opening modal
    fetchBalances()

    if (type === 'burn') {
      setBurnModalOpen(true)
    } else if (type === 'send') {
      setSendModalOpen(true)
    } else {
      setModalOpen(true)
    }
  }

  const handleAmountChange = (value: string) => {
    // Remove existing commas first
    const withoutCommas = value.replace(/,/g, '')
    
    // Only allow whole numbers
    const cleanValue = withoutCommas.replace(/[^\d]/g, '')
    
    // Store the clean value for calculations
    setAmount(cleanValue)

    // Format with commas for display
    if (cleanValue) {
      const formattedValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      setFormattedAmount(formattedValue)
    } else {
      setFormattedAmount('')
    }
  }

  const handleTrade = async () => {
    if (!authenticated) {
      login()
      return
    }

    const pendingToast = toast.loading('setting everything up...')

    try {
      setIsLoading(true)
      const activeWallet = user?.wallet
      if (!activeWallet?.address) {
        toast.dismiss(pendingToast)
        toast.error('No wallet connected')
        return
      }

      if (tradeType === 'burn') {
        const tokenAmount = BigInt(Math.floor(Number(amount)))
        if (tokenAmount > tokenBalance) {
          toast.dismiss(pendingToast)
          toast.error('Insufficient token balance')
          return
        }

        try {
          toast.update(pendingToast, {
            render: 'sending to ensurance proceeds...',
            type: 'info',
            isLoading: true
          })

          const walletClient = createWalletClient({
            chain: base,
            transport: custom(window.ethereum)
          })

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: ZORA_1155_ABI,
            functionName: 'safeTransferFrom',
            args: [
              activeWallet.address,
              PROCEEDS_ADDRESS,
              tokenId,
              tokenAmount,
              '0x' // No data needed
            ],
            chain: base,
            account: activeWallet.address as `0x${string}`
          })
          
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.update(pendingToast, {
            render: 'certificates sent to ensurance proceeds',
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: '!bg-orange-500/20 !text-orange-200 !border-orange-500/30'
          })
          
          setModalOpen(false)
          await fetchBalances()
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
      } else if (tradeType === 'buy') {
        if (!primaryMintActive) {
          toast.dismiss(pendingToast)
          toast.error('This policy is no longer issuing certificates')
          return
        }

        const quantity = BigInt(Math.floor(Number(amount)))
        if (maxSupply && totalMinted && quantity + totalMinted > maxSupply) {
          toast.dismiss(pendingToast)
          toast.error('Exceeds maximum supply')
          return
        }

        try {
          const walletClient = createWalletClient({
            chain: base,
            transport: custom(window.ethereum)
          })

          // Get mint parameters and check if approval is needed
          const { parameters, needsApproval } = await mintToken(
            contractAddress,
            tokenId.toString(),
            Number(quantity),
            activeWallet.address as `0x${string}`,
            walletClient
          )

          // If approval is needed, handle it first
          if (needsApproval) {
            toast.update(pendingToast, {
              render: 'approving USDC...',
              type: 'info',
              isLoading: true
            })

            // Approve USDC
            const approveHash = await walletClient.writeContract({
              address: CONTRACTS.usdc,
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
              args: [CONTRACTS.erc20Minter, maxUint256],
              account: activeWallet.address as `0x${string}`
            })

            await publicClient.waitForTransactionReceipt({ hash: approveHash })

            toast.update(pendingToast, {
              render: 'USDC approved! Click ENSURE again to mint.',
              type: 'success',
              isLoading: false,
              autoClose: 5000
            })
            
            setModalOpen(false)
            await fetchBalances()
            return
          }

          // Proceed with mint
          toast.update(pendingToast, {
            render: 'confirming purchase...',
            type: 'info',
            isLoading: true
          })

          if (!pricePerToken) {
            toast.dismiss(pendingToast)
            toast.error('Price per token not found')
            return
          }

          // Calculate total price
          const totalPrice = pricePerToken * BigInt(quantity)

          console.log('Mint contract call:', {
            address: CONTRACTS.erc20Minter,
            functionName: 'mint',
            args: [
              activeWallet.address,    // 1. mintTo
              BigInt(quantity),        // 2. quantity
              contractAddress,         // 3. tokenAddress
              tokenId,                 // 4. tokenId
              totalPrice,              // 5. totalValue
              CONTRACTS.usdc,          // 6. currency
              CONTRACTS.mintReferral,  // 7. mintReferral
              ''                       // 8. comment
            ]
          })

          const hash = await walletClient.writeContract({
            address: CONTRACTS.erc20Minter,
            abi: ZORA_ERC20_MINTER_ABI,
            functionName: 'mint',
            args: [
              activeWallet.address,    // 1. mintTo
              BigInt(quantity),        // 2. quantity
              contractAddress,         // 3. tokenAddress
              tokenId,                 // 4. tokenId
              totalPrice,              // 5. totalValue
              CONTRACTS.usdc,          // 6. currency
              CONTRACTS.mintReferral,  // 7. mintReferral
              ''                       // 8. comment
            ],
            chain: base,
            account: activeWallet.address as `0x${string}`
          })
          
          await publicClient.waitForTransactionReceipt({ hash })
          
          toast.update(pendingToast, {
            render: 'purchase successful',
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: '!bg-green-500/20 !text-green-200 !border-green-500/30'
          })
          
          setModalOpen(false)
          await fetchBalances()
          return
        } catch (error: any) {
          console.error('Trade failed:', error)
          toast.dismiss(pendingToast)
          if (error?.code === 4001 || error?.message?.includes('rejected')) {
            toast.error('Transaction cancelled')
          } else if (error?.status === 429 || error?.message?.includes('429')) {
            toast.error('Rate limit exceeded. Please try again in a few seconds.')
          } else if (error?.message?.includes('insufficient funds')) {
            toast.error('Insufficient USDC balance')
          } else {
            toast.error(error?.message || 'Failed to execute trade')
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

  const handleSend = async () => {
    if (!authenticated) {
      login()
      return
    }

    const pendingToast = toast.loading('setting everything up...')

    try {
      setIsLoading(true)
      const activeWallet = user?.wallet
      if (!activeWallet?.address) {
        toast.dismiss(pendingToast)
        toast.error('No wallet connected')
        return
      }

      // Validate recipient
      if (!sendRecipient || !/^0x[a-fA-F0-9]{40}$/.test(sendRecipient)) {
        toast.dismiss(pendingToast)
        toast.error('Invalid recipient address')
        setSendRecipientError('Invalid address')
        return
      }

      const tokenAmount = BigInt(Math.floor(Number(amount)))
      if (tokenAmount > tokenBalance) {
        toast.dismiss(pendingToast)
        toast.error('Insufficient token balance')
        return
      }
      if (tokenAmount <= 0) {
        toast.dismiss(pendingToast)
        toast.error('Amount must be greater than zero')
        return
      }

      try {
        toast.update(pendingToast, {
          render: 'sending tokens...',
          type: 'info',
          isLoading: true
        })

        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        })

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ZORA_1155_ABI,
          functionName: 'safeTransferFrom',
          args: [
            activeWallet.address,
            sendRecipient,
            tokenId,
            tokenAmount,
            '0x'
          ],
          chain: base,
          account: activeWallet.address as `0x${string}`
        })

        await publicClient.waitForTransactionReceipt({ hash })

        toast.update(pendingToast, {
          render: 'tokens sent successfully',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
          className: '!bg-amber-500/20 !text-amber-200 !border-amber-500/30'
        })

        setSendModalOpen(false)
        await fetchBalances()
        return
      } catch (error: any) {
        console.error('Send failed:', error)
        if (error?.code === 4001 || error?.message?.includes('rejected')) {
          toast.dismiss(pendingToast)
          toast.error('transaction cancelled')
        } else {
          toast.update(pendingToast, {
            render: 'send failed',
            type: 'error',
            isLoading: false,
            autoClose: 5000
          })
        }
        return
      }
    } catch (error: any) {
      console.error('Send failed:', error)
      toast.dismiss(pendingToast)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        toast.error('Transaction cancelled')
      } else {
        toast.error(error?.message || 'Failed to send tokens')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Format balance for display
  const formatBalance = (balance: bigint) => {
    if (balance === BigInt(0)) return '0'
    return balance.toString()
  }

  return (
    <>
      <div className="flex gap-8">
        {/* Ensure (buy) button - green */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleOpenModal('buy')}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!primaryMintActive}
              >
                <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ensure (buy)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Transform (swap) button - blue (commented out, TODO) */}
        {/**
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleOpenModal('sell')}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                <RefreshCw className={`${iconSize} stroke-[1.5] stroke-blue-500 hover:stroke-blue-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>transform (swap)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        */}
        {/* TODO: add exchange functionality later for 1155 to erc20 */}

        {/* Send button - amber */}
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

      {showBalance && (
        <div className="mt-2 text-sm text-gray-400 text-center">
          balance: {formatBalance(tokenBalance)}
          <div className="text-xs text-gray-500 font-mono mt-0.5">{tokenName || 'Certificate'}</div>
        </div>
      )}

      {/* Buy/Mint Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  ensure
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenName || tokenSymbol}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={imageUrl}
                  alt={tokenSymbol}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">U</span>
                  </div>
                  USDC
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-black text-gray-400 hover:text-gray-300 transition-colors">→</div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                      <Image
                        src={imageUrl}
                        alt={tokenSymbol}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    {tokenSymbol}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
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
                <div className="text-sm text-gray-400">
                  your balance: {formatUsdcAmount(usdcBalance)}
                  <div className="text-xs text-gray-500 font-mono mt-0.5">USDC</div>
                </div>
                
                {pricePerToken && (
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Price per token:</span>
                      <span className="text-white">${formatUsdcAmount(pricePerToken)} USDC</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total price:</span>
                      <span className="text-white">
                        {amount && !isNaN(Number(amount)) && Number.isInteger(Number(amount)) && Number(amount) > 0
                          ? `$${formatUsdcAmount(pricePerToken * BigInt(Number(amount)))} USDC` 
                          : '$0.00 USDC'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                      <span className="text-gray-400">You will receive:</span>
                      <span className="text-white">
                        {amount ? `${formattedAmount} ${tokenSymbol}` : `0 ${tokenSymbol}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
              disabled={isLoading || !amount || Number(amount) <= 0 || !primaryMintActive}
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

      {/* Burn Modal */}
      <Dialog open={burnModalOpen} onOpenChange={setBurnModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  burn
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenName || 'Certificate'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={imageUrl}
                  alt={tokenName || 'Certificate'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            {tokenBalance === BigInt(0) ? (
              <div className="space-y-6 text-center">
                <div className="text-lg text-gray-300">
                  buy to burn
                </div>
                <Button
                  onClick={() => {
                    setBurnModalOpen(false)
                    setTimeout(() => {
                      handleOpenModal('buy')
                    }, 100)
                  }}
                  className="bg-green-600 hover:bg-green-500"
                  disabled={!primaryMintActive}
                >
                  ENSURE NOW
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                      <Image
                        src={imageUrl}
                        alt={tokenName || 'Certificate'}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    {tokenName || 'Certificate'}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    quantity to burn
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
                  <div className="text-sm text-gray-400">
                    your balance: {formatBalance(tokenBalance)}
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{tokenName || 'Certificate'}</div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">You will send:</span>
                      <span className="text-white">
                        {amount ? `${formattedAmount} ${tokenName || 'Certificate'}` : `0 ${tokenName || 'Certificate'}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>
                      burn locks these assets in the protocol to create{' '}
                      <a 
                        href="https://ensurance.app/proceeds/0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                      >
                        ensurance proceeds
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => setBurnModalOpen(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTrade}
              disabled={isLoading || !amount || Number(amount) <= 0}
              className="min-w-[120px] bg-orange-600 hover:bg-orange-500"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'BURN'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  send
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenName || 'Certificate'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={imageUrl}
                  alt={tokenName || 'Certificate'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                recipient
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
              {selectedAccount && sendRecipient && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm text-gray-400">
                      {selectedAccount.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {truncateAddress(sendRecipient)}
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
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                quantity to send
              </label>
              <Input
                type="text"
                value={formattedAmount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="enter amount"
                className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${amountError ? 'border-red-500' : ''}`}
              />
              {amountError && (
                <div className="text-sm text-red-500">
                  {amountError}
                </div>
              )}
              <div className="text-sm text-gray-400">
                your balance: {formatBalance(tokenBalance)}
                <div className="text-xs text-gray-500 font-mono mt-0.5">{tokenName || 'Certificate'}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">You will send:</span>
                <span className="text-white">
                  {amount ? `${formattedAmount} ${tokenName || 'Certificate'}` : `0 ${tokenName || 'Certificate'}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => setSendModalOpen(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading || !amount || Number(amount) <= 0 || !sendRecipient}
              className="min-w-[120px] bg-amber-600 hover:bg-amber-500"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'SEND'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 