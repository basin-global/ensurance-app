'use client'

import { useState, useEffect } from 'react'
import { parseUnits, createWalletClient, custom, type Hash } from 'viem'
import { base } from 'viem/chains'
import { createToken, finalizeToken, type CreateTokenStatus } from '@/modules/specific/create'
import { USDC_ADDRESS } from '@/modules/specific/config/ERC20'
import { MAX_SUPPLY_OPEN_EDITION } from '@/modules/specific/config/ERC1155'
import { toast } from 'react-toastify'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { isAppAdmin } from '@/config/admin'
import Link from 'next/link'
import { createWalletClient as createWalletClientViem, http } from 'viem'
import type { WalletClient } from 'viem'

export default function CreateSpecificPage() {
  const { user, ready, authenticated } = usePrivy()
  const address = user?.wallet?.address as `0x${string}` | undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<CreateTokenStatus>()
  const { wallets } = useWallets()
  const activeWallet = wallets[0] // Get first connected wallet

  // Redirect non-admins
  useEffect(() => {
    if (ready && authenticated && address && !isAppAdmin(address)) {
      router.push('/specific')
    }
  }, [ready, authenticated, address, router])

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mediaFile, setMediaFile] = useState<File>()
  const [thumbnailFile, setThumbnailFile] = useState<File>()
  const [price, setPrice] = useState('')
  const [isLimitedEdition, setIsLimitedEdition] = useState(false)
  const [maxSupply, setMaxSupply] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWallet || !mediaFile || !name || !price) {
      console.error('Missing required fields')
      return
    }

    try {
      setIsLoading(true)
      setStatus(undefined)

      // Get the provider from the wallet
      const provider = await activeWallet.getEthereumProvider()
      
      const walletClient = createWalletClientViem({
        account: activeWallet.address as `0x${string}`,
        chain: base,
        transport: custom(provider)
      })

      // TODO: Implement proper type checking for createToken parameters
      /*
      const result = await createToken({
        metadata: {
          name,
          description,
          maxSupply: isLimitedEdition ? BigInt(maxSupply) : MAX_SUPPLY_OPEN_EDITION,
          createReferral: address
        },
        mediaFile,
        thumbnailFile,
        // TODO: Implement proper type checking for payoutRecipient
        // erc20Config: {
        //   currency: USDC_ADDRESS,
        //   pricePerToken: parseUnits(price, 6),
        //   payoutRecipient: address
        // },
        creatorAccount: address as `0x${string}`,
        onStatus: (newStatus) => {
          setStatus(newStatus)
          
          if (newStatus.error) {
            toast.error(newStatus.error)
            return
          }

          // Show step progress
          switch (newStatus.step) {
            case 'creating-token':
              toast.info('Creating token on-chain...')
              break
            case 'uploading-media':
              toast.info('Uploading media files...')
              break
            case 'storing-metadata':
              toast.info('Storing metadata...')
              break
            case 'complete':
              toast.success('Token created successfully!')
              break
          }
        }
      })
      */

      // TODO: Implement proper type checking for contract interactions
      // Extract contract parameters from Zora SDK result
      /*
      const { abi, functionName, args, address: contractAddress } = result.parameters
      const hash = await walletClient.writeContract({
        abi,
        functionName,
        args,
        address: contractAddress,
        account: activeWallet.address as `0x${string}`,
        chain: base
      }) as Hash
      
      setStatus(prev => prev ? {
        ...prev,
        txHash: hash
      } : prev)

      // After transaction is confirmed, upload media and finalize
      await finalizeToken({
        tokenId: result.tokenId,
        metadata: {
          name,
          description,
          maxSupply: isLimitedEdition ? BigInt(maxSupply) : MAX_SUPPLY_OPEN_EDITION,
          createReferral: address
        },
        mediaFile,
        thumbnailFile,
        onStatus: (newStatus) => {
          setStatus(prev => ({
            ...prev,
            ...newStatus,
            txHash: hash
          }))
        }
      })
      */

    } catch (error) {
      console.error('Error creating token:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaFile(file)

    // Clear thumbnail if not video
    if (!file.type.includes('video')) {
      setThumbnailFile(undefined)
    }
  }

  // Status display component
  const StatusDisplay = () => {
    if (!status) return null

    return (
      <div className="mt-6 p-4 border rounded-lg bg-background/50">
        <h3 className="font-medium mb-2">Creation Status</h3>
        
        <div className="space-y-2">
          {status.tokenId && (
            <p className="text-sm">
              Token ID: {status.tokenId}
            </p>
          )}
          
          {status.txHash && (
            <p className="text-sm">
              Transaction: {' '}
              <Link 
                href={`https://explorer.zora.energy/tx/${status.txHash}`}
                target="_blank"
                className="text-primary hover:underline"
              >
                View on Explorer
              </Link>
            </p>
          )}

          {status.mediaUrl && (
            <p className="text-sm">
              Media: {' '}
              <Link 
                href={status.mediaUrl}
                target="_blank"
                className="text-primary hover:underline"
              >
                View File
              </Link>
            </p>
          )}

          <div className="flex gap-2 items-center mt-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              {/* Progress bar */}
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: (() => {
                    switch (status.step) {
                      case 'creating-token': return '25%'
                      case 'uploading-media': return '50%'
                      case 'storing-metadata': return '75%'
                      case 'complete': return '100%'
                      default: return '0%'
                    }
                  })()
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {status.step === 'complete' ? 'Done!' : 'In Progress...'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Show loading or unauthorized state
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container max-w-2xl">
          <div className="bg-background border rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Create Specific Certificate</h1>
            <p className="text-muted-foreground">Please connect your wallet to continue.</p>
          </div>
        </div>
      </div>
    )
  }

  if (address && !isAppAdmin(address)) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="container max-w-2xl">
        <div className="bg-background border rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-8">Create Specific Certificate</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-white">Name</label>
              <input
                id="name"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-white">Description</label>
              <textarea
                id="description"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="media" className="block text-sm font-medium text-white">Media File (Image or Video)</label>
              <input
                id="media"
                type="file"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white file:text-white file:bg-transparent"
                accept="image/*,video/mp4"
                onChange={handleMediaChange}
                required
              />
            </div>

            {mediaFile?.type.includes('video') && (
              <div className="space-y-2">
                <label htmlFor="thumbnail" className="block text-sm font-medium text-white">Thumbnail Image (Required for Video)</label>
                <input
                  id="thumbnail"
                  type="file"
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white file:text-white file:bg-transparent"
                  accept="image/*"
                  onChange={e => setThumbnailFile(e.target.files?.[0])}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="price" className="block text-sm font-medium text-white">Price (USDC)</label>
              <input
                id="price"
                type="number"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={e => {
                  // Format to 2 decimal places for display
                  const value = parseFloat(e.target.value).toFixed(2)
                  if (!isNaN(parseFloat(value))) {
                    setPrice(value)
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Edition Type</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!isLimitedEdition}
                    onChange={() => setIsLimitedEdition(false)}
                    className="rounded border-gray-300"
                  />
                  <span>Open Edition</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={isLimitedEdition}
                    onChange={() => setIsLimitedEdition(true)}
                    className="rounded border-gray-300"
                  />
                  <span>Limited Edition</span>
                </label>
              </div>
            </div>

            {isLimitedEdition && (
              <div className="space-y-2">
                <label htmlFor="maxSupply" className="block text-sm font-medium text-white">Max Supply</label>
                <input
                  id="maxSupply"
                  type="number"
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500"
                  min="1"
                  step="1"
                  placeholder="Enter maximum supply"
                  value={maxSupply}
                  onChange={e => setMaxSupply(e.target.value)}
                  required={isLimitedEdition}
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Token'}
            </button>
          </form>

          <StatusDisplay />
        </div>
      </div>
    </div>
  )
}
