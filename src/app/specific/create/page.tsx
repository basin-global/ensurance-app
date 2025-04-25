'use client'

import { useState, useEffect } from 'react'
import { parseUnits } from 'viem'
import { createToken } from '@/modules/specific/create'
import { USDC_ADDRESS } from '@/modules/specific/config/ERC20'
import { MAX_SUPPLY_OPEN_EDITION } from '@/modules/specific/config/ERC1155'
import { toast } from 'react-toastify'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { isAppAdmin } from '@/config/admin'

export default function CreateSpecificPage() {
  const { user, ready, authenticated } = usePrivy()
  const address = user?.wallet?.address as `0x${string}` | undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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
    if (!address || !mediaFile || !name || !price || !user?.wallet) return

    try {
      setIsLoading(true)

      const { tokenId } = await createToken({
        metadata: {
          name,
          description,
          maxSupply: isLimitedEdition ? BigInt(maxSupply) : MAX_SUPPLY_OPEN_EDITION,
          createReferral: address // Use admin address as referral
        },
        mediaFile,
        thumbnailFile,
        erc20Config: {
          currency: USDC_ADDRESS,
          pricePerToken: parseUnits(price, 6),
          payoutRecipient: address // The admin address will receive 95% of the USDC from mints
        },
        creatorAccount: address
      })

      // The SDK handles simulation and execution internally
      toast.success(`Token Creation Started! Token ID will be: ${tokenId}`)

    } catch (error) {
      console.error(error)
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
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <input
                id="name"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium">Description</label>
              <textarea
                id="description"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="media" className="block text-sm font-medium">Media File (Image or Video)</label>
              <input
                id="media"
                type="file"
                className="w-full rounded-md border bg-background px-3 py-2"
                accept="image/*,video/mp4"
                onChange={handleMediaChange}
                required
              />
            </div>

            {mediaFile?.type.includes('video') && (
              <div className="space-y-2">
                <label htmlFor="thumbnail" className="block text-sm font-medium">Thumbnail Image (Required for Video)</label>
                <input
                  id="thumbnail"
                  type="file"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  accept="image/*"
                  onChange={e => setThumbnailFile(e.target.files?.[0])}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="price" className="block text-sm font-medium">Price (USDC)</label>
              <input
                id="price"
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
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
                <label htmlFor="maxSupply" className="block text-sm font-medium">Max Supply</label>
                <input
                  id="maxSupply"
                  type="number"
                  className="w-full rounded-md border bg-background px-3 py-2"
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
        </div>
      </div>
    </div>
  )
}
