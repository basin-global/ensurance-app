'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { PageHeader } from '@/components/layout/PageHeader'
import Portfolio from '@/modules/account-modules/portfolio'

export default function OperatorPortfolioPage() {
  const { authenticated, ready, user } = usePrivy()
  const [searchQuery, setSearchQuery] = useState('')

  // Show loading state while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PageHeader 
          title="operator portfolio"
          showSearch={true}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search your portfolio..."
        />
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show connect prompt if not authenticated
  if (!authenticated || !user?.wallet?.address) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PageHeader 
          title="operator portfolio"
          showSearch={true}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search your portfolio..."
        />
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">Connect your wallet to view your portfolio</p>
            <p className="text-sm text-gray-500">Use the connect button in the header to get started</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader 
        title="operator portfolio"
        showSearch={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search your portfolio..."
      />
      <div className="container mx-auto px-4">
        <Portfolio
          address={user.wallet.address}
          context="operator"
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}
