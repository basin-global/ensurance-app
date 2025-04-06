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
import { tradeCoin, getTradeFromLogs } from '@zoralabs/coins-sdk'
import { TRADE_REFERRER } from '@/modules/general/service'
import { toast } from 'react-toastify'
import Image from 'next/image'

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
  const [estimatedTokens, setEstimatedTokens] = useState<string>('0')
  const [ethBalance, setEthBalance] = useState<bigint>(BigInt(0))
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [coinDetails, setCoinDetails] = useState<{ 
    symbol: string,
    price?: string,
    decimals?: number 
  } | null>(null)

  // Fetch ETH balance when needed
  useEffect(() => {
    if (authenticated && userAddress) {
      const fetchEthBalance = async () => {
        try {
          const publicClient = createPublicClient({
            chain: base,
            transport: http('https://mainnet.base.org')
          })

          console.log('Fetching ETH balance for:', userAddress)
          const eth = await publicClient.getBalance({ address: userAddress })
          console.log('ETH balance:', formatEther(eth), 'ETH')
          setEthBalance(eth)
        } catch (error) {
          console.error('Error fetching ETH balance:', error)
        }
      }
      fetchEthBalance()
    }
  }, [authenticated, userAddress])

  // Fetch token balance when needed
  useEffect(() => {
    if (authenticated && userAddress && contractAddress) {
      const fetchTokenBalance = async () => {
        try {
          const publicClient = createPublicClient({
            chain: base,
            transport: http('https://mainnet.base.org')
          })

          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: ZORA_COIN_ABI,
            functionName: 'balanceOf',
            args: [userAddress]
          }) as bigint

          console.log('Token balance:', formatEther(balance), coinDetails?.symbol || 'tokens')
          setTokenBalance(balance)
        } catch (error) {
          console.error('Error fetching token balance:', error)
        }
      }
      fetchTokenBalance()
    }
  }, [authenticated, userAddress, contractAddress, coinDetails?.symbol])

  // Calculate estimated tokens when ETH amount changes
  useEffect(() => {
    if (coinDetails?.price && ethAmount) {
      try {
        const ethValue = Number(ethAmount)
        const pricePerToken = Number(coinDetails.price)
        if (pricePerToken > 0) {
          const tokens = ethValue / pricePerToken
          setEstimatedTokens(tokens.toFixed(6))
        }
      } catch (error) {
        console.error('Error calculating tokens:', error)
      }
    }
  }, [ethAmount, coinDetails?.price])

  const handleOpenModal = async (type: 'buy' | 'sell') => {
    if (!authenticated) {
      login()
      return
    }
    setTradeType(type)
    setModalOpen(true)
    if (!coinDetails) {
      const details = await getCoinDetails(contractAddress)
      setCoinDetails(details)
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
      
      // Create clients according to SDK docs
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org')
      })

      // Create wallet client following SDK example
      const walletClient = createWalletClient({
        account: userAddress as `0x${string}`,
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

      // Create trade parameters according to SDK docs
      const tradeParams = {
        direction: tradeType,
        target: contractAddress,
        args: {
          recipient: userAddress as `0x${string}`,
          orderSize: tradeType === 'buy' ? 
            ethAmountInWei : // For buy: use ETH amount in wei
            parseEther(estimatedTokens), // For sell: scale tokens by 10^18 like Zora UI
          minAmountOut: BigInt(0),
          tradeReferrer: TRADE_REFERRER
        }
      }

      console.log('Trade params:', {
        type: tradeType,
        contractAddress,
        amount: tradeType === 'buy' ? 
          `${ethAmount} ETH (${ethAmountInWei.toString(16)} hex)` : 
          `${estimatedTokens} tokens (${parseEther(estimatedTokens).toString(16)} hex)`,
        params: tradeParams
      })

      const pendingToast = toast.loading(`${tradeType === 'buy' ? 'ensuring natural capital' : 'un-ensuring natural capital'}...`)
      
      try {
        const result = await tradeCoin(tradeParams, walletClient, publicClient)
        
        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash: result.hash })
        
        // Get trade details from logs
        const tradeEvent = getTradeFromLogs(receipt, tradeType)
        if (tradeEvent) {
          console.log('Trade details:', tradeEvent)
          const amount = tradeType === 'buy' ? 
            (tradeEvent as any).coinsPurchased : 
            (tradeEvent as any).amountSold
          toast.update(pendingToast, {
            render: `successfully ${tradeType === 'buy' ? 'ensured' : 'un-ensured'} natural capital`,
            type: 'success',
            isLoading: false,
            autoClose: 5000
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
    // Ensure we don't lose precision by avoiding number conversion
    return formatted.replace(/\.?0+$/, '') // Remove trailing zeros after decimal, but keep significant digits
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
        <DialogContent className="sm:max-w-[425px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                <Image 
                  src={imageUrl}
                  alt={coinDetails?.symbol || 'Token'}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                {tradeType === 'buy' ? 'ensure' : 'un-ensure'}
                {coinDetails?.symbol && <span className="text-muted-foreground text-sm ml-2">{coinDetails.symbol}</span>}
              </div>
            </DialogTitle>
            <DialogDescription className="space-y-3 mt-2">
              {priceDetails && (
                <div className="flex flex-col gap-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">price per token</p>
                    <p className="text-sm font-medium text-white">{priceDetails.pricePerToken} ETH</p>
                  </div>
                  {tradeType === 'buy' && Number(ethAmount) > 0 && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-400">estimated tokens</p>
                      <p className="text-sm font-medium text-white">{priceDetails.estimatedTokens}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium text-gray-300">
                {tradeType === 'buy' ? 'ensure with eth' : 'tokens to un-ensure'}
              </label>
              <Input
                id="amount"
                type="number"
                value={tradeType === 'buy' ? ethAmount : estimatedTokens}
                onChange={(e) => tradeType === 'buy' ? setEthAmount(e.target.value) : setEstimatedTokens(e.target.value)}
                placeholder="enter amount"
                className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500"
                min="0"
                step="0.000001"
              />
              <div className="flex justify-end">
                <p className="text-xs text-gray-500">
                  balance: {tradeType === 'buy' 
                    ? `${formatBalance(ethBalance)} eth`
                    : `${formatBalance(tokenBalance)} ${coinDetails?.symbol?.toLowerCase() || 'tokens'}`
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
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
                    disabled={isLoading || (tradeType === 'buy' ? !ethAmount || Number(ethAmount) <= 0 : !estimatedTokens || Number(estimatedTokens) <= 0)}
                    className={`min-w-[120px] font-bold ${
                      tradeType === 'buy' 
                        ? 'bg-green-600 hover:bg-green-500 text-white' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>processing...</span>
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