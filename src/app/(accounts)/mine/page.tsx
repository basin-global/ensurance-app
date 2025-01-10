'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { useSite } from '@/contexts/site-context'

export default function MinePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const { user, ready } = usePrivy()
  const walletAddress = user?.wallet?.address
  const placeholder = site === 'onchain-agents' ? 'Search agents...' : 'Search accounts...'

  // If not ready or not connected, show appropriate message
  if (!ready || !walletAddress) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 font-mono">
          {!ready ? 'Loading...' : 'Please connect your wallet to view your accounts'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <AssetSearch 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery}
          placeholder={placeholder}
        />
      </div>
      <AccountsGrid 
        searchQuery={searchQuery}
        walletAddress={walletAddress}
      />
    </div>
  )
} 