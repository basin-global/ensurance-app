'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { PageHeader } from '@/components/layout/PageHeader'

export default function MinePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, ready, authenticated } = usePrivy()
  const walletAddress = user?.wallet?.address

  // If not ready or not connected, show appropriate message
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

  if (!authenticated || !walletAddress) {
    return (
      <div className="min-h-screen flex flex-col">
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
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="my agent accounts"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <AccountsGrid 
            searchQuery={searchQuery}
            walletAddress={walletAddress}
          />
        </div>
      </div>
    </div>
  )
} 