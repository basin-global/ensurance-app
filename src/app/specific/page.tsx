'use client'

import { useState } from 'react'
import { PageHeader } from "@/components/layout/PageHeader"
import SpecificGrid from '@/modules/specific/SpecificGrid'
import SpecificMarketSummary from '@/modules/specific/SpecificMarketSummary'

interface MarketData {
  total_volume?: string
  market_cap?: string
}

export default function SpecificPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [marketData, setMarketData] = useState<MarketData[]>([])

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <PageHeader 
              title="specific ensurance"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder="what do you want to ensure?"
            />
          </div>
          <div className="min-w-[300px] pt-2">
            <SpecificMarketSummary variant="subtle" />
          </div>
        </div>

        <SpecificGrid
          searchQuery={searchQuery}
          onDataChange={setMarketData}
        />
      </div>
    </div>
  )
}