import { PlusCircle, MinusCircle } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useGeneralService } from '@/modules/general/service/hooks'
import { useState, useEffect } from 'react'
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http,
  parseEther, 
  formatEther,
  type PublicClient,
  type WalletClient
} from 'viem'
import { base } from 'viem/chains'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json'
import { tradeCoin, tradeCoinCall, getTradeFromLogs, simulateBuy } from '@zoralabs/coins-sdk'
import { TRADE_REFERRER } from '@/modules/general/service'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'

interface EnsureButtonsProps {
  contractAddress: `0x${string}`
  showMinus?: boolean
  size?: 'sm' | 'lg'
  defaultAmount?: bigint
  imageUrl?: string
  tokenUri?: string
}

export function EnsureButtons({ 
  contractAddress,
  showMinus = true,
  size = 'lg',
  defaultAmount = parseEther('0.000111'),
  imageUrl = '/assets/no-image-found.png'
}: EnsureButtonsProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { getBuyConfig, getSellConfig, userAddress, getCoinDetails } = useGeneralService()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [ethAmount, setEthAmount] = useState('0.000111')
  const debouncedEthAmount = useDebounce(ethAmount, 500)
  const [estimatedTokens, setEstimatedTokens] = useState<string>('0')
  const [ethBalance, setEthBalance] = useState<bigint>(BigInt(0))
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [ethPriceInUsd, setEthPriceInUsd] = useState<number>(0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [coinDetails, setCoinDetails] = useState<{ 
    symbol: string,
    price?: string,
    decimals?: number 
  } | null>(null)

  // Fetch ETH price in USD
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const data = await response.json()
        setEthPriceInUsd(data.ethereum.usd)
      } catch (error) {
        console.error('Error fetching ETH price:', error)
      }
    }
    fetchEthPrice()
  }, [])

  const handleOpenModal = async (type: 'buy' | 'sell') => {
    if (!authenticated) {
      login()
      return
    }
    
    setTradeType(type)
    setModalOpen(true)
    
    try {
      // Create public client for reading balances
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org')
      })

      // Fetch ETH balance
      if (userAddress) {
        const eth = await publicClient.getBalance({ address: userAddress })
        setEthBalance(eth)
      }

      // Fetch token balance
      if (userAddress && contractAddress) {
        const balance = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'balanceOf',
          args: [userAddress]
        }) as bigint
        setTokenBalance(balance)
      }

      // Fetch coin details if needed
      if (!coinDetails) {
        const details = await getCoinDetails(contractAddress)
        setCoinDetails(details)
      }
    } catch (error) {
      console.error('Error fetching balances:', error)
      // Don't block modal opening on balance fetch errors
      // User can still see previous balances if any
    }
  }

  const handleTrade = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!authenticated || !userAddress) {
      login()
      return
    }

    try {
      setIsLoading(true)
      const activeWallet = wallets[0]
      if (!activeWallet) return

      const provider = await activeWallet.getEthereumProvider()
      
      // Create public client for reading
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org')
      })

      // Create wallet client
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider)
      })

      const ethAmountInWei = parseEther(ethAmount)

      // Check balances before trade
      if (tradeType === 'buy') {
        if (ethAmountInWei > ethBalance) {
          toast.error(`Insufficient ETH balance. Need ${ethAmount} ETH but have ${formatEther(ethBalance)} ETH`)
          return
        }
      } else {
        const tokenAmountInWei = parseEther(estimatedTokens)
        if (tokenAmountInWei > tokenBalance) {
          toast.error('Insufficient token balance')
          return
        }
      }

      // Create trade parameters with new type structure
      const tradeParams = {
        direction: tradeType,
        target: contractAddress as `0x${string}`,
        args: {
          recipient: userAddress as `0x${string}`,
          orderSize: tradeType === 'buy' ? 
            ethAmountInWei : 
            parseEther(estimatedTokens),
          minAmountOut: BigInt(0),
          tradeReferrer: TRADE_REFERRER as `0x${string}`
        }
      }

      // Get contract call configuration
      const contractCallParams = tradeCoinCall(tradeParams)

      console.log('Trade params:', {
        type: tradeType,
        contractAddress,
        amount: tradeType === 'buy' ? 
          `${ethAmount} ETH (${ethAmountInWei.toString(16)} hex)` : 
          `${estimatedTokens} tokens (${parseEther(estimatedTokens).toString(16)} hex)`,
        params: contractCallParams
      })

      const pendingToast = toast.loading(`${tradeType === 'buy' ? 'ensuring what matters' : 'un-ensuring what matters'}...`)
      
      try {
        // Execute the trade using writeContract
        const hash = await walletClient.writeContract({
          ...contractCallParams,
          value: tradeType === 'buy' ? ethAmountInWei : BigInt(0),
          chain: base,
          account: userAddress as `0x${string}`
        })
        
        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        
        // Get trade details from logs
        const tradeEvent = getTradeFromLogs(receipt, tradeType)
        if (tradeEvent) {
          console.log('Trade details:', tradeEvent)
          const amount = tradeType === 'buy' ? 
            (tradeEvent as any).coinsPurchased : 
            (tradeEvent as any).amountSold
          toast.update(pendingToast, {
            render: `you have ${tradeType === 'buy' ? 'ensured' : 'un-ensured'} what matters`,
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: tradeType === 'buy' ? '' : '!bg-red-500/20 !text-red-200 !border-red-500/30'
          })
        } else {
          toast.update(pendingToast, {
            render: 'transaction completed',
            type: 'success',
            isLoading: false,
            autoClose: 5000
          })
        }
        
        setModalOpen(false)
      } catch (error: any) {
        console.error(`${tradeType === 'buy' ? 'Buy' : 'Sell'} failed:`, error)
        if (error?.code === 4001 || error?.message?.includes('rejected')) { // User rejected or cancelled
          toast.dismiss(pendingToast)
          toast.error('transaction cancelled')
        } else if (error?.message?.includes('insufficient funds')) {
          toast.update(pendingToast, {
            render: 'insufficient eth balance',
            type: 'error',
            isLoading: false,
            autoClose: 5000
          })
        } else {
          // Keep generic error simple
          toast.update(pendingToast, {
            render: 'transaction failed',
            type: 'error',
            isLoading: false,
            autoClose: 5000
          })
        }
      }

    } catch (error: any) {
      console.error(`${tradeType === 'buy' ? 'Buy' : 'Sell'} failed:`, error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) { // User rejected or cancelled
        toast.error('transaction cancelled')
      } else if (error?.message?.includes('insufficient funds')) {
        toast.error('insufficient eth balance')
      } else {
        // Keep generic error simple
        toast.error('transaction failed')
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
    // Keep only 6 decimal places
    return formatted.replace(/\.(\d{0,6}).*$/, '.$1')
  }

  // Calculate price and conversion details
  const getPriceDetails = () => {
    if (!coinDetails?.price) return null
    
    const priceInEth = Number(coinDetails.price)
    const formattedPrice = priceInEth.toLocaleString('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    })
    
    return {
      pricePerToken: formattedPrice,
      estimatedTokens: Number(estimatedTokens).toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      })
    }
  }

  const priceDetails = getPriceDetails()

  // Calculate estimated tokens when ETH amount changes
  useEffect(() => {
    let mounted = true
    if (!contractAddress || !debouncedEthAmount || tradeType !== 'buy' || !userAddress || !modalOpen) return

    const calculateTokens = async () => {
      try {
        setIsSimulating(true)
        console.log('Calculating tokens with:', {
          ethAmount: debouncedEthAmount,
          contractAddress
        })

        const publicClient = createPublicClient({
          chain: base,
          transport: http('https://mainnet.base.org')
        })

        // Get the pool address
        const poolAddress = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_COIN_ABI,
          functionName: 'poolAddress'
        }) as `0x${string}`

        if (!mounted) return

        // Get the pool state
        const poolState = await publicClient.readContract({
          address: poolAddress,
          abi: [
            {
              inputs: [],
              name: 'slot0',
              outputs: [
                { name: 'sqrtPriceX96', type: 'uint160' },
                { name: 'tick', type: 'int24' },
                { name: 'observationIndex', type: 'uint16' },
                { name: 'observationCardinality', type: 'uint16' },
                { name: 'observationCardinalityNext', type: 'uint16' },
                { name: 'feeProtocol', type: 'uint8' },
                { name: 'unlocked', type: 'bool' }
              ],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'slot0'
        })

        if (!mounted) return

        // Calculate price from sqrtPriceX96
        const sqrtPriceX96 = poolState[0]
        const price = (Number(sqrtPriceX96) / 2**96) ** 2
        const tokenPrice = price * (10**18)
        
        // Calculate tokens
        const ethValue = parseEther(debouncedEthAmount)
        const tokens = ethValue * BigInt(Math.floor(tokenPrice)) / BigInt(10**18)

        if (!mounted) return
        setEstimatedTokens(formatEther(tokens))
      } catch (error) {
        console.error('Error calculating tokens:', error)
        if (mounted && coinDetails?.price) {
          const ethValue = Number(debouncedEthAmount)
          const pricePerToken = Number(coinDetails.price)
          const tokens = ethValue / pricePerToken
          setEstimatedTokens(tokens.toFixed(6))
        }
      } finally {
        if (mounted) {
          setIsSimulating(false)
        }
      }
    }

    calculateTokens()
    return () => {
      mounted = false
    }
  }, [debouncedEthAmount, contractAddress, tradeType, userAddress, modalOpen, coinDetails?.price])

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
                  <MinusCircle className={`${iconSize} stroke-[1.5] stroke-red-500 hover:stroke-red-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>un-ensure (sell)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {tradeType === 'buy' ? 'ensure' : 'un-ensure'}
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {coinDetails?.symbol || 'Token'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={imageUrl}
                  alt={coinDetails?.symbol || 'Token'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>
          <div className="py-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left side - ETH details */}
              <div className="space-y-3">
                <label htmlFor="amount" className="text-sm font-medium text-gray-300">
                  {tradeType === 'buy' ? 'ensure with eth' : 'tokens to un-ensure'}
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    id="amount"
                    type="number"
                    value={tradeType === 'buy' ? ethAmount : estimatedTokens}
                    onChange={(e) => tradeType === 'buy' ? setEthAmount(e.target.value) : setEstimatedTokens(e.target.value)}
                    placeholder="enter amount"
                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium w-36"
                    min="0"
                    step="0.000001"
                  />
                </div>
                {tradeType === 'buy' && ethPriceInUsd > 0 && (
                  <div className="text-sm text-gray-400">
                    ${(Number(ethAmount) * ethPriceInUsd).toFixed(2)} USD
                  </div>
                )}
                <div className="text-sm text-gray-400 whitespace-nowrap">
                  your balance: {formatBalance(ethBalance)} ETH
                </div>
              </div>

              {/* Right side - Token details */}
              <div className="space-y-5">
                <div className="text-sm font-medium text-gray-300 text-right">
                  estimated {coinDetails?.symbol?.toLowerCase() || 'tokens'}
                </div>
                <div className="text-2xl font-medium text-white text-right">
                  {isSimulating ? 'calculating...' : Math.floor(Number(estimatedTokens)).toLocaleString()}
                </div>
                {tradeType === 'sell' && (
                  <div className="text-sm text-gray-400 text-right">
                    your balance: {formatBalance(tokenBalance)} {coinDetails?.symbol?.toLowerCase() || 'tokens'}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => setModalOpen(false)}
              className="text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleTrade}
                    disabled={isLoading || isSimulating || (tradeType === 'buy' ? !ethAmount || Number(ethAmount) <= 0 : !estimatedTokens || Number(estimatedTokens) <= 0)}
                    className={`min-w-[120px] font-bold ${
                      tradeType === 'buy' 
                        ? 'bg-green-600 hover:bg-green-500 text-white' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {isLoading || isSimulating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{isSimulating ? 'calculating...' : 'processing...'}</span>
                      </div>
                    ) : (
                      tradeType === 'buy' ? 'ENSURE' : 'UN-ENSURE'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tradeType === 'buy' ? '(Buy)' : '(Sell)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}