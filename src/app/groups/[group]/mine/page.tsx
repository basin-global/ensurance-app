'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import { useSite } from '@/contexts/site-context'
import { GroupInfo } from '@/modules/groups/GroupInfo'

export default function GroupMinePage({ params }: { params: { group: string } }) {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const { user, ready } = usePrivy()
  const walletAddress = user?.wallet?.address
  const placeholder = site === 'onchain-agents' ? 'Search agents...' : 'Search accounts...'

  // If not ready or not connected, show appropriate message
  if (!ready || !walletAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <SubNavigation type="accounts" groupName={params.group} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 font-mono">
            {!ready ? 'Loading...' : 'Please connect your wallet to view your accounts'}
          </p>
        </div>
        <GroupInfo groupName={params.group} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SubNavigation type="accounts" groupName={params.group} />
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="space-y-4">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery}
              placeholder={placeholder}
            />
          </div>
          <AccountsGrid 
            groupName={params.group} 
            searchQuery={searchQuery}
            walletAddress={walletAddress}
          />
        </div>
      </div>
      <GroupInfo groupName={params.group} />
    </div>
  )
} 