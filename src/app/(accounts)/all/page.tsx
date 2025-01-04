'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import { useSite } from '@/contexts/site-context'

export default function AllAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const placeholder = site === 'onchain-agents' ? 'Search agents...' : 'Search accounts...'

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
          <AccountsGrid searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  )
} 