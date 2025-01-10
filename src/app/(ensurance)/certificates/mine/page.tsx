'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'
import { useSite } from '@/contexts/site-context'

export default function CertificatesMinePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const { user, ready } = usePrivy()
  const walletAddress = user?.wallet?.address
  const isDev = process.env.NODE_ENV === 'development'
  
  const urlPrefix = site === 'onchain-agents' ? (isDev ? '/site-onchain-agents' : '') : ''

  // If not ready or not connected, show appropriate message
  if (!ready || !walletAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <SubNavigation type="certificates" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 font-mono">
            {!ready ? 'Loading...' : 'Please connect your wallet to view your certificates'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SubNavigation type="certificates" />
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
              urlPrefix={urlPrefix}
              walletAddress={walletAddress}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 