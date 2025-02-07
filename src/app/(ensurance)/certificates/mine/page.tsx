'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import CertificatesGrid from '@/modules/certificates/components/CertificatesGrid'

export default function CertificatesMinePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, ready, authenticated } = usePrivy()
  const walletAddress = user?.wallet?.address

  // If not ready, show loading
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-center mb-4">Loading...</p>
          <p className="text-gray-500 text-center">Please wait...</p>
        </div>
      </div>
    )
  }

  // If not connected, show connect message
  if (!authenticated || !walletAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-center mb-4">👋 Connect your wallet</p>
          <p className="text-gray-500 text-center">
            Connect your wallet to view your certificates
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="space-y-4">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search certificates..."
            />
          </div>
          <div className="bg-[#111] rounded-lg shadow-md p-4 md:p-6">
            <CertificatesGrid
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              walletAddress={walletAddress}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 