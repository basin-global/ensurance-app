'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'

export default function GroupAllPage({ params }: { params: { group: string } }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <SubNavigation type="accounts" groupName={params.group} />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery}
              placeholder="Search accounts..." 
            />
          </div>
          <AccountsGrid groupName={params.group} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  )
} 