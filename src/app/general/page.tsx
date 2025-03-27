'use client'

import { useState } from 'react'
import { PageHeader } from "@/components/layout/PageHeader"
import GeneralGrid from '@/modules/general/GeneralGrid'
import MarketSummary from '@/components/MarketSummary'

interface MarketData {
  total_volume?: string
  market_cap?: string
}

export default function GeneralPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [marketData, setMarketData] = useState<MarketData[]>([])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <PageHeader 
              title="general ensurance"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder="what do you want to ensure?"
            />
          </div>
          <div className="min-w-[300px] pt-2">
            <MarketSummary 
              data={marketData}
              variant="subtle"
            />
          </div>
        </div>

        <GeneralGrid
          searchQuery={searchQuery}
          onDataChange={setMarketData}
        />
      </div>
    </div>
  )
}