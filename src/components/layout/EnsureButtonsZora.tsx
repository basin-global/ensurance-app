import { PlusCircle, MinusCircle, Flame } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useGeneralService, useEthPrice } from '@/modules/general/service/hooks'
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
  showBurn?: boolean
  size?: 'sm' | 'lg'
  defaultAmount?: bigint
  imageUrl?: string
  tokenUri?: string
}

export function EnsureButtons({ 
  contractAddress,
  showMinus = true,
  showBurn = false,
  size = 'lg',
  defaultAmount = parseEther('0.000111'),
  imageUrl = '/assets/no-image-found.png'
}: EnsureButtonsProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { getBuyConfig, getSellConfig, userAddress, getCoinDetails } = useGeneralService()
  const { price: ethPrice } = useEthPrice()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'burn'>('buy')
  const [ethAmount, setEthAmount] = useState('0.000111')
  const debouncedEthAmount = useDebounce(ethAmount, 500)
  const [estimatedTokens, setEstimatedTokens] = useState<string>('0')
  const [ethBalance, setEthBalance] = useState<bigint>(BigInt(0))
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [isSimulating, setIsSimulating] = useState(false)
  const [coinDetails, setCoinDetails] = useState<{ 
    symbol: string,
    price?: string,
    decimals?: number 
  } | null>(null)
  const ethAmountInWei = ethAmount ? parseEther(ethAmount) : BigInt(0)

  const handleOpenModal = async (type: 'buy' | 'sell' | 'burn') => {
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

      // For burn, set the estimated tokens to the current balance
      if (type === 'burn') {
        setEstimatedTokens(formatEther(tokenBalance))
      }
    } catch (error) {
      console.error('Error fetching balances:', error)
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

      if (tradeType === 'burn') {
        const tokenAmountInWei = parseEther(estimatedTokens)
        if (tokenAmountInWei > tokenBalance) {
          toast.error('Insufficient token balance')
          return
        }

        const pendingToast = toast.loading('burning tokens...')
        
        try {
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
      }

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

      const pendingToast = toast.loading(`${tradeType === 'buy' ? 'ensuring what matters' : tradeType === 'sell' ? 'un-ensuring what matters' : 'burning tokens'}...`)
      
      try {
        // Execute the trade using writeContract
        const hash = await walletClient.writeContract({
          ...contractCallParams,
          value: tradeType === 'buy' ? ethAmountInWei : tradeType === 'sell' ? BigInt(0) : BigInt(0),
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
            tradeType === 'sell' ? 
            (tradeEvent as any).amountSold : 
            (tradeEvent as any).amountBurned
          toast.update(pendingToast, {
            render: `you have ${tradeType === 'buy' ? 'ensured' : tradeType === 'sell' ? 'un-ensured' : 'burned'} what matters`,
            type: 'success',
            isLoading: false,
            autoClose: 5000,
            className: tradeType === 'buy' ? '' : tradeType === 'sell' ? '!bg-red-500/20 !text-red-200 !border-red-500/30' : '!bg-orange-500/20 !text-orange-200 !border-orange-500/30'
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
        console.error(`${tradeType === 'buy' ? 'Buy' : tradeType === 'sell' ? 'Sell' : 'Burn'} failed:`, error)
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
      console.error(`${tradeType === 'buy' ? 'Buy' : tradeType === 'sell' ? 'Sell' : 'Burn'} failed:`, error)
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
    const num = Number(formatted)
    
    if (num < 1) {
      // Show up to 6 decimal places for small numbers
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      })
    } else {
      // Show only 2 decimal places for numbers >= 1
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    }
  }

  // Format input value with appropriate decimals
  const formatInputValue = (value: string) => {
    const num = Number(value)
    if (num === 0 || isNaN(num)) return '0'
    
    if (num < 0.000001) return '< 0.000001'
    if (num < 0.01) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    if (num < 1000) {
      const fixed = num.toFixed(2)
      return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
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
          // Fallback to using coin details price if pool calculation fails
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
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {tradeType === 'buy' ? 'ensure' : tradeType === 'sell' ? 'un-ensure' : 'burn'}
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
            {/* Token flow header */}
            <div className="space-y-6">
              {/* Header showing token flow */}
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {tradeType === 'burn' ? (
                    <>
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        <Image
                          src={imageUrl}
                          alt={coinDetails?.symbol || 'Token'}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      </div>
                      {coinDetails?.symbol}
                    </>
                  ) : tradeType === 'buy' ? (
                    <>
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        <Image
                          src="https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg"
                          alt="ETH"
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      </div>
                      ETH
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        <Image
                          src={imageUrl}
                          alt={coinDetails?.symbol || 'Token'}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      </div>
                      {coinDetails?.symbol}
                    </>
                  )}
                </div>
                {tradeType !== 'burn' && (
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-black text-gray-400 hover:text-gray-300 transition-colors">→</div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      {tradeType === 'buy' ? (
                        <>
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                            <Image
                              src={imageUrl}
                              alt={coinDetails?.symbol || 'Token'}
                              width={24}
                              height={24}
                              className="object-cover"
                            />
                          </div>
                          {coinDetails?.symbol}
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                            <Image
                              src="https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg"
                              alt="ETH"
                              width={24}
                              height={24}
                              className="object-cover"
                            />
                          </div>
                          ETH
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-[1fr,1fr] gap-4 items-start">
                <div className="space-y-3">
                  <label htmlFor="amount" className="text-sm font-medium text-gray-300">
                    {tradeType === 'buy' ? 'ensure with eth' : 
                     tradeType === 'sell' ? 'tokens to un-ensure' : 
                     'tokens to burn'}
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    value={tradeType === 'buy' ? ethAmount : estimatedTokens}
                    onChange={(e) => tradeType === 'buy' ? setEthAmount(e.target.value) : setEstimatedTokens(e.target.value)}
                    placeholder="enter amount"
                    className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                      (tradeType === 'buy' && ethAmountInWei > ethBalance) || 
                      (tradeType !== 'buy' && parseEther(estimatedTokens || '0') > tokenBalance) 
                        ? 'border-red-500' : ''
                    }`}
                    min="0"
                    step={tradeType === 'buy' ? "0.000001" : Number(tokenBalance) < 1 ? "0.000001" : "0.01"}
                  />
                  {tradeType === 'buy' && ethAmountInWei > ethBalance && (
                    <div className="text-sm text-red-500">
                      Insufficient ETH balance
                    </div>
                  )}
                  {tradeType !== 'buy' && parseEther(estimatedTokens || '0') > tokenBalance && (
                    <div className="text-sm text-red-500">
                      Insufficient token balance
                    </div>
                  )}
                  {tradeType === 'buy' && ethPrice > 0 && (
                    <div className="text-sm text-gray-400">
                      ${(Number(ethAmount) * ethPrice).toFixed(2)} USD
                    </div>
                  )}
                  <div className="text-sm text-gray-400">
                    your balance: {tradeType === 'buy' ? 
                      `${formatBalance(ethBalance)} ETH` : 
                      `${formatBalance(tokenBalance)} ${coinDetails?.symbol?.toLowerCase() || 'tokens'}`}
                  </div>
                </div>

                {tradeType !== 'burn' && (
                  <div className="space-y-3">
                    <div className="text-right">
                      <div className="text-2xl font-medium text-white">
                        {isSimulating ? 'calculating...' : 
                         (tradeType === 'buy' && ethAmountInWei > ethBalance) ? '0' :
                         formatInputValue(estimatedTokens)}
                      </div>
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
              disabled={
                isLoading || 
                (tradeType === 'burn' ? !estimatedTokens || Number(estimatedTokens) <= 0 : 
                 tradeType === 'buy' ? (!ethAmount || Number(ethAmount) <= 0 || ethAmountInWei > ethBalance) : 
                 !estimatedTokens || Number(estimatedTokens) <= 0 || parseEther(estimatedTokens) > tokenBalance)
              }
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