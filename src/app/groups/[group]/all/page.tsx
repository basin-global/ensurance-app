'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import { GroupInfo } from '@/modules/groups/GroupInfo'

export default function GroupAllPage({ params }: { params: { group: string } }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <SubNavigation type="accounts" groupName={params.group} />
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="space-y-4">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery}
              placeholder="Search accounts..."
            />
          </div>
          <AccountsGrid 
            groupName={params.group} 
            searchQuery={searchQuery}
          />
        </div>
      </div>
      <GroupInfo groupName={params.group} />
    </div>
  )
} 