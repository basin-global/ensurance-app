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
import { toast } from 'react-toastify'
import Image from 'next/image'

interface EnsureButtonsProps {
  contractAddress: `0x${string}`
  tokenId: string
  size?: 'sm' | 'lg'
  imageUrl?: string
}

export function EnsureButtons1155({ 
  contractAddress,
  tokenId,
  size = 'lg',
  imageUrl = '/assets/no-image-found.png'
}: EnsureButtonsProps) {
  const { login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  // Fetch token info when modal opens
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!modalOpen) return

      try {
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

        // Log raw token info for debugging
        console.log('Raw token info from SDK:', token)

        setTokenInfo(token)
      } catch (error) {
        console.error('Error fetching token info:', error)
        toast.error('Failed to fetch token info')
      }
    }

    fetchTokenInfo()
  }, [modalOpen, contractAddress, tokenId])

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

      const pendingToast = toast.loading('preparing mint transaction...')
      
      try {
        // Create collector client
        const collectorClient = createCollectorClient({ 
          chainId: base.id, 
          publicClient: publicClient as any // TODO: Fix type issue
        })

        // Get mint parameters
        const { parameters, erc20Approval } = await collectorClient.mint({
          tokenContract: SPECIFIC_CONTRACT_ADDRESS,
          mintType: "1155",
          tokenId: BigInt(tokenId),
          quantityToMint: BigInt(quantity),
          minterAccount: activeWallet.address as `0x${string}`,
          mintReferral: '0x7EdDce062a290c59feb95E2Bd7611eeE24610A6b' as `0x${string}`,
          mintRecipient: activeWallet.address as `0x${string}`
        })

        // Log mint parameters for debugging
        console.log('Mint parameters:', {
          parameters,
          erc20Approval,
          tokenContract: SPECIFIC_CONTRACT_ADDRESS,
          tokenId,
          quantity,
          minterAccount: activeWallet.address,
          mintReferral: '0x7EdDce062a290c59feb95E2Bd7611eeE24610A6b',
          mintRecipient: activeWallet.address
        })

        // If ERC20 approval is needed, handle it
        if (erc20Approval) {
          toast.update(pendingToast, {
            render: 'approving USDC spend...',
            type: 'info',
            isLoading: true
          })

          console.log('ERC20 Approval needed:', {
            token: erc20Approval.erc20,
            approveTo: erc20Approval.approveTo,
            amount: erc20Approval.quantity
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

        // Send the mint transaction
        toast.update(pendingToast, {
          render: 'minting token...',
          type: 'info',
          isLoading: true
        })

        const hash = await walletClient.writeContract({
          ...parameters,
          account: activeWallet.address as `0x${string}`,
          value: BigInt(0) // No ETH value since we're using USDC
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        
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

  // Calculate total price - handle both possible token info structures
  const pricePerToken = tokenInfo?.pricePerToken || tokenInfo?.salesConfig?.pricePerToken || BigInt(0)
  const totalPrice = pricePerToken * BigInt(quantity || '0')

  return (
    <>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  mint token
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  Token #{tokenId}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden mr-4">
                <Image 
                  src={imageUrl}
                  alt={`Token #${tokenId}`}
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
    </>
  )
} 