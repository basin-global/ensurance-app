'use client'

import { useState, useEffect } from 'react'
import { createWalletClient, custom, type Hash } from 'viem'
import { base } from 'viem/chains'
import { createToken, finalizeToken, type CreateTokenStatus } from '@/modules/specific/create'
import { CONTRACTS, MAX_SUPPLY_OPEN_EDITION } from '@/modules/specific/config'
import { toast } from 'react-toastify'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { isAppAdmin } from '@/config/admin'
import Link from 'next/link'
import { createWalletClient as createWalletClientViem, http, createPublicClient } from 'viem'
import type { WalletClient } from 'viem'
import { PageHeader } from '@/components/layout/PageHeader'

// Initialize public client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

export default function CreateSpecificPage() {
  const { user, ready, authenticated } = usePrivy()
  const address = user?.wallet?.address as `0x${string}` | undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<CreateTokenStatus>()
  const { wallets } = useWallets()
  const activeWallet = wallets[0]

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
  const [previewUrl, setPreviewUrl] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWallet || !mediaFile || !name) {
      toast.error('Please fill in all required fields')
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

      // Step 1: Create token on-chain
      const result = await createToken({
        metadata: {
          name,
          description,
          maxSupply: MAX_SUPPLY_OPEN_EDITION
        },
        mediaFile,
        creatorAccount: activeWallet.address as `0x${string}`,
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

      // Step 2: Submit setup transaction
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

      // Step 3: Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash })

      // Step 4: Upload media and store metadata
      await finalizeToken({
        tokenId: result.tokenId,
        metadata: {
          name,
          description,
          maxSupply: MAX_SUPPLY_OPEN_EDITION
        },
        mediaFile,
        onStatus: (newStatus) => {
          setStatus(prev => ({
            ...prev,
            ...newStatus,
            txHash: hash
          }))
        }
      })

      // Step 5: Redirect to token page
      if (status?.redirectUrl) {
        router.push(status.redirectUrl)
      } else {
        router.push(`/specific/${CONTRACTS.specific}/${result.tokenId}/manage`)
      }

    } catch (error) {
      console.error('Error creating token:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported')
      return
    }

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Load image to check dimensions
    const img = new Image()
    img.onload = () => {
      if (img.width !== img.height) {
        toast.warning('Image should be square. It will be cropped to square.')
      }
      setMediaFile(file)
    }
    img.src = url
  }

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

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
            <span className="text-sm text-gray-500">
              {status.step === 'creating-token' && 'Creating...'}
              {status.step === 'uploading-media' && 'Uploading...'}
              {status.step === 'storing-metadata' && 'Storing...'}
              {status.step === 'complete' && 'Complete'}
              {status.step === 'error' && 'Error'}
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
            <h1 className="text-2xl font-bold mb-6">create specific ensurance</h1>
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
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="create specific ensurance"
        showSearch={false}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-gray-900 text-white border-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-white">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-gray-900 text-white border-gray-700"
              rows={4}
            />
          </div>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium mb-1 text-white">Media (PNG) *</label>
          <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg bg-gray-900 border-gray-700 cursor-pointer hover:border-primary/50 transition-colors">
            <div className="space-y-1 text-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-32 object-cover rounded-lg" />
              ) : (
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <div className="flex text-sm text-gray-300">
                <span className="font-medium text-primary hover:text-primary/80">
                  Upload a file
                </span>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-400">PNG only, up to 10MB</p>
            </div>
            <input type="file" className="hidden" onChange={handleMediaChange} accept="image/png" />
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 text-lg font-medium text-white rounded-lg shadow-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {isLoading ? 'Creating...' : 'Create Certificate'}
          </button>
        </div>

        {/* Status Display */}
        <StatusDisplay />
      </form>
    </div>
  )
}
