import { PlusCircle } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http,
  erc20Abi,
  formatUnits
} from 'viem'
import { base } from 'viem/chains'
import { getToken, createCollectorClient } from '@zoralabs/protocol-sdk'
import { SPECIFIC_CONTRACT_ADDRESS } from './config/ERC1155'
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
import Image from 'next/image'

interface CollectProps {
  contractAddress: `0x${string}`
  tokenId: string
  size?: 'sm' | 'lg'
  imageUrl?: string
  tokenInfo?: any
  onTokenInfoUpdate?: (info: any) => void
}

export function Collect({ 
  contractAddress,
  tokenId,
  size = 'lg',
  imageUrl = '/assets/no-image-found.png',
  tokenInfo: initialTokenInfo,
  onTokenInfoUpdate
}: CollectProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [tokenInfo, setTokenInfo] = useState(initialTokenInfo)
  const [isLoadingInfo, setIsLoadingInfo] = useState(!initialTokenInfo)

  // Fetch token info when component mounts or when modal opens
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!modalOpen && initialTokenInfo) return

      try {
        setIsLoadingInfo(true)
        const publicClient = createPublicClient({
          chain: base,
          transport: http('https://mainnet.base.org')
        })

        const { token } = await getToken({
          publicClient,
          tokenContract: contractAddress,
          mintType: "1155",
          tokenId: BigInt(tokenId)
        })

        setTokenInfo(token)
        onTokenInfoUpdate?.(token)
      } catch (error) {
        console.error('Error fetching token info:', error)
        toast.error('Failed to fetch token info')
      } finally {
        setIsLoadingInfo(false)
      }
    }

    fetchTokenInfo()
  }, [modalOpen, contractAddress, tokenId, onTokenInfoUpdate, initialTokenInfo])

  const handleOpenModal = async () => {
    if (!authenticated) {
      login()
      return
    }
    
    setModalOpen(true)
  }

  const handleMint = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!authenticated) {
      login()
      return
    }

    try {
      setIsLoading(true)
      const activeWallet = wallets[0]
      if (!activeWallet) return

      const provider = await activeWallet.getEthereumProvider()
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org')
      })

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider)
      })

      const pendingToast = toast.loading('preparing mint transaction...')
      
      try {
        const collectorClient = createCollectorClient({ 
          chainId: base.id, 
          publicClient: publicClient as any
        })

        // Get token info first to ensure we have latest data
        const { token } = await getToken({
          tokenContract: SPECIFIC_CONTRACT_ADDRESS,
          mintType: "1155",
          tokenId: BigInt(tokenId)
        })

        const { parameters, erc20Approval } = await collectorClient.mint({
          tokenContract: SPECIFIC_CONTRACT_ADDRESS,
          mintType: "1155",
          tokenId: BigInt(tokenId),
          quantityToMint: BigInt(quantity),
          minterAccount: activeWallet.address as `0x${string}`,
          mintReferral: '0x7EdDce062a290c59feb95E2Bd7611eeE24610A6b' as `0x${string}`,
          mintRecipient: activeWallet.address as `0x${string}`
        })

        if (erc20Approval) {
          toast.update(pendingToast, {
            render: 'approving USDC spend...',
            type: 'info',
            isLoading: true
          })

          const approvalHash = await walletClient.writeContract({
            abi: erc20Abi,
            address: erc20Approval.erc20,
            functionName: 'approve',
            args: [erc20Approval.approveTo, erc20Approval.quantity],
            account: activeWallet.address as `0x${string}`,
          })

          await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        }

        toast.update(pendingToast, {
          render: 'minting token...',
          type: 'info',
          isLoading: true
        })

        const hash = await walletClient.writeContract({
          ...parameters,
          account: activeWallet.address as `0x${string}`,
          value: BigInt(0)
        })

        await publicClient.waitForTransactionReceipt({ hash })
        
        toast.update(pendingToast, {
          render: 'token minted successfully',
          type: 'success',
          isLoading: false,
          autoClose: 5000
        })
        
        setModalOpen(false)
      } catch (error: any) {
        console.error('Mint failed:', error)
        if (error?.code === 4001 || error?.message?.includes('rejected')) {
          toast.dismiss(pendingToast)
          toast.error('transaction cancelled')
        } else {
          toast.update(pendingToast, {
            render: 'mint failed',
            type: 'error',
            isLoading: false,
            autoClose: 5000
          })
        }
      }
    } catch (error: any) {
      console.error('Mint failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        toast.error('transaction cancelled')
      } else {
        toast.error('mint failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  // Calculate total price
  const pricePerToken = tokenInfo?.pricePerToken || tokenInfo?.salesConfig?.pricePerToken || BigInt(0)
  const totalPrice = pricePerToken * BigInt(quantity || '0')

  if (isLoadingInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left column - Image */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-900">
        {tokenInfo?.metadata?.image ? (
          <Image
            src={tokenInfo.metadata.image}
            alt={tokenInfo.metadata.name || 'Token'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No image available
          </div>
        )}
      </div>

      {/* Right column - Details */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {tokenInfo?.metadata?.name || 'Token'}
          </h1>
          {tokenInfo?.metadata?.description && (
            <p className="mt-2 text-gray-400">
              {tokenInfo.metadata.description}
            </p>
          )}
        </div>

        {/* Price and Mint Button */}
        <div className="flex items-center justify-between pt-4">
          {pricePerToken > BigInt(0) && (
            <div className="text-xl font-medium text-white">
              {formatUnits(pricePerToken, 6)} USDC
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenModal}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>mint token</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  mint token
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {tokenInfo?.metadata?.name || 'Token'}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={tokenInfo?.metadata?.image || imageUrl}
                  alt={tokenInfo?.metadata?.name || 'Token'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-6">
              {/* Price info */}
              {pricePerToken > BigInt(0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Price per token</span>
                    <span>{formatUnits(pricePerToken, 6)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Total price</span>
                    <span>{formatUnits(totalPrice, 6)} USDC</span>
                  </div>
                </div>
              )}

              {/* Quantity input */}
              <div className="space-y-3">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-300">
                  quantity to mint
                </label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="enter quantity"
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium"
                  min="1"
                  step="1"
                />
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
              onClick={handleMint}
              disabled={isLoading || !quantity || Number(quantity) <= 0}
              className="min-w-[120px] bg-green-600 hover:bg-green-500"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'MINT'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 