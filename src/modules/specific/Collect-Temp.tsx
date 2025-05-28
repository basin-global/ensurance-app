import { collectToken } from './collect'
import { useAccount } from 'wagmi'
import { useState } from 'react'

type CollectProps = {
  contractAddress: `0x${string}`
  tokenId: string
  tokenInfo: any
  onTokenInfoUpdate: (info: any) => void
}

export function Collect({ contractAddress, tokenId, tokenInfo, onTokenInfoUpdate }: CollectProps) {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCollect = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setError(null)

      // TODO: Get walletClient from wagmi
      const walletClient = {} // Temporary placeholder

      await collectToken({
        tokenId,
        quantity: BigInt(1),
        recipient: address,
        walletClient,
        onSuccess: () => {
          // Refresh token info after successful collection
          onTokenInfoUpdate({ ...tokenInfo })
        },
        onError: (error) => {
          setError(error.message)
        }
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to collect token')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">{tokenInfo?.token?.name || 'Token'}</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleCollect}
        disabled={isLoading || !address}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Collecting...' : 'Collect Token'}
      </button>
    </div>
  )
} 