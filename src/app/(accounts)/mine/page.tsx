'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import { useSite } from '@/contexts/site-context'

export default function MinePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const { user, ready, authenticated } = usePrivy()
  const walletAddress = user?.wallet?.address
  const placeholder = site === 'onchain-agents' ? 'Search agents...' : 'Search accounts...'

  // If not ready or not connected, show appropriate message
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col">
        <SubNavigation type="accounts" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-center mb-4">Loading...</p>
          <p className="text-gray-500 text-center">Please wait...</p>
        </div>
      </div>
    )
  }

  if (!authenticated || !walletAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <SubNavigation type="accounts" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-center mb-4">👋 Connect your wallet</p>
          <p className="text-gray-500 text-center">
            Connect your wallet to view your accounts and manage your assets
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SubNavigation type="accounts" />
      <div className="container mx-auto px-4 pt-0 pb-4">
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
      </div>
    </div>
  )
} 