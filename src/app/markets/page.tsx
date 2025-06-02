'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import EnsureGrid from '@/modules/ensure/EnsureGrid'

export default function MarketsPage() {
  const [marketData, setMarketData] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-8">
          <PageHeader
            title="ensurance markets"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="what do you want to ensure?"
            showSearch={true}
          />
          <EnsureGrid 
            types={['general', 'specific']}
            urlPrefix=""
            searchQuery={searchQuery}
            onDataChange={setMarketData}
          />
        </div>
      </div>
    </div>
  )
} 