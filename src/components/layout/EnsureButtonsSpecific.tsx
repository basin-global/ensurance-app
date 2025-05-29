'use client'

import { PlusCircle, RefreshCw, Flame } from 'lucide-react'
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
import { mintTokens } from '@/modules/specific/collect'
import { formatUsdcAmount, parseUsdcAmount, SUPPORTED_TOKENS } from '@/modules/specific/config'

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

type TradeType = 'buy' | 'sell' | 'burn'

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
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [burnModalOpen, setBurnModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<TradeType>('buy')
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState<string>('')
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))

  // Create a single publicClient instance
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  // Add effect to fetch token balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!contractAddress || !authenticated) return
      
      try {
        const activeWallet = wallets[0]
        if (!activeWallet) return

        const balance = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_1155_ABI,
          functionName: 'balanceOf',
          args: [activeWallet.address, tokenId]
        }) as bigint
        
        setTokenBalance(balance)
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }

    fetchBalance()
  }, [contractAddress, authenticated, wallets, publicClient, tokenId])

  const handleOpenModal = (type: TradeType) => {
    if (!authenticated) {
      login()
      return
    }

    if (type === 'buy' && !primaryMintActive) {
      toast.error('This policy is no longer issuing certificates')
      return
    }

    setAmount('')
    setFormattedAmount('')
    setAmountError('')
    setTradeType(type)
    if (type === 'burn') {
      setBurnModalOpen(true)
    } else {
      setModalOpen(true)
    }
  }

  const handleAmountChange = (value: string) => {
    // Remove existing commas first
    const withoutCommas = value.replace(/,/g, '')
    
    // Only allow numbers and one decimal point
    const cleanValue = withoutCommas.replace(/[^\d.]/g, '')
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length
    if (decimalCount > 1) return

    // Handle decimal places for USDC (6 decimals)
    if (cleanValue.includes('.')) {
      const [whole, fraction] = cleanValue.split('.')
      if (fraction.length > 6) return
    }

    // Store the clean value for calculations
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

  const handleTrade = async () => {
    if (!authenticated) {
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

      if (tradeType === 'burn') {
        const tokenAmount = BigInt(Math.floor(Number(amount)))
        if (tokenAmount > tokenBalance) {
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
            abi: ZORA_1155_ABI,
            functionName: 'burnBatch',
            args: [
              activeWallet.address,
              [tokenId],
              [tokenAmount]
            ],
            chain: base,
            account: activeWallet.address as `0x${string}`
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
          toast.update(pendingToast, {
            render: 'confirming purchase...',
            type: 'info',
            isLoading: true
          })

          const walletClient = createWalletClient({
            chain: base,
            transport: custom(provider)
          })

          // Use Zora's mint functionality
          const mintParameters = await mintTokens(
            contractAddress,
            tokenId.toString(),
            Number(quantity),
            activeWallet.address as `0x${string}`,
            publicClient
          )

          const hash = await walletClient.writeContract({
            ...mintParameters,
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
          return
        } catch (error: any) {
          console.error('Purchase failed:', error)
          if (error?.code === 4001 || error?.message?.includes('rejected')) {
            toast.dismiss(pendingToast)
            toast.error('transaction cancelled')
          } else {
            toast.update(pendingToast, {
              render: 'purchase failed',
              type: 'error',
              isLoading: false,
              autoClose: 5000
            })
          }
          return
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

  // Format balance for display
  const formatBalance = (balance: bigint) => {
    if (balance === BigInt(0)) return '0'
    return balance.toString()
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
          balance: {formatBalance(tokenBalance)} {tokenSymbol}
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
                  your balance: {formatBalance(tokenBalance)}
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
                        {amount ? `$${formatUsdcAmount(pricePerToken * BigInt(Math.floor(Number(amount))))} USDC` : '$0.00 USDC'}
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
                        alt={tokenSymbol}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    {tokenSymbol}
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
                  </div>

                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">You will burn:</span>
                      <span className="text-white">
                        {amount ? `${formattedAmount} ${tokenSymbol}` : `0 ${tokenSymbol}`}
                      </span>
                    </div>
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
    </>
  )
} 