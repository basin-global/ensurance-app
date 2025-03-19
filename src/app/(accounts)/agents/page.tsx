'use client'

import { useState } from 'react'
import AccountsGrid from '@/modules/accounts/AccountsGrid'
import { PageHeader } from '@/components/layout/PageHeader'

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="ensurance agents"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search agents..."
          />
          <AccountsGrid searchQuery={searchQuery} isAgent={true} />
        </div>
      </div>
    </div>
  )
}