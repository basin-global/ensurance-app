'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { PageHeader } from '@/components/layout/PageHeader'

export default function AllAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="all accounts"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <AccountsGrid searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  )
} 