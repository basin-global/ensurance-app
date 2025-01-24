'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'

export default function AllAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <div className="container mx-auto px-4 pt-0 pb-4">
        <div className="space-y-4">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery}
              placeholder="Search accounts..."
            />
          </div>
          <AccountsGrid searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  )
} 