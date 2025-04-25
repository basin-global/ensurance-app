'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { getSpecificToken } from '@/modules/specific/mint'
import { specificContract, isSpecificContract, SpecificMetadata } from '@/modules/specific/config/ERC1155'
import type { Address } from 'viem'

export default function SpecificTokenPage() {
  const params = useParams()
  const { ready, authenticated, user } = usePrivy()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [tokenData, setTokenData] = useState<SpecificMetadata>()

  // Validate contract address format
  const contract = params.contract as string
  if (!contract?.startsWith('0x') || contract.length !== 42) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Invalid Contract</h1>
        <p className="text-red-600">
          Invalid contract address format.
        </p>
      </div>
    )
  }

  // Now we can safely cast to Address since we validated the format
  if (!isSpecificContract(contract as Address)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Invalid Contract</h1>
        <p className="text-red-600">
          This contract is not a valid specific certificate contract.
        </p>
      </div>
    )
  }

  const tokenId = params.tokenId as string

  useEffect(() => {
    async function loadToken() {
      try {
        setLoading(true)
        const { metadata } = await getSpecificToken(tokenId)
        setTokenData(metadata)
      } catch (err) {
        console.error('Error loading token:', err)
        setError('Failed to load token data')
      } finally {
        setLoading(false)
      }
    }

    if (ready) {
      loadToken()
    }
  }, [ready, tokenId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Loading...</h1>
      </div>
    )
  }

  if (error || !tokenData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Error</h1>
        <p className="text-red-600">{error || 'Token not found'}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">
        {tokenData.name || `Token #${tokenId}`}
      </h1>
      <div className="max-w-2xl">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Token details will go here */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Token details and mint UI coming soon...
            </p>
            {authenticated ? (
              <div className="mt-4">
                {/* Mint UI will go here */}
                <p className="text-sm text-gray-500">
                  Mint functionality coming soon...
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-4">
                Connect your wallet to mint this token.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
