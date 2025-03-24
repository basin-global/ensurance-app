'use client'

// Syndicates functionality coming soon
// This page will be updated with syndicate features in an upcoming release

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import SyndicateGrid from '@/modules/syndicates/SyndicateGrid'

export default function SyndicatesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-8">
          <PageHeader
            title="ensurance syndicates"
            showSearch={false}
          />

          <SyndicateGrid 
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  )
}
