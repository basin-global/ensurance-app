'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { GroupInfo } from '@/modules/groups/GroupInfo'
import VerificationSection from '@/components/layout/verifications/VerificationSection'

export default function GroupAllPage({ params }: { params: { group: string } }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <div className="w-full flex justify-center mb-8">
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
      <VerificationSection type="group" name={params.group} />
    </div>
  )
} 