'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import GeneralGrid, { GeneralCertificate } from '@/modules/general/GeneralGrid'

export default function MarketsPage() {
  const [marketData, setMarketData] = useState<GeneralCertificate[]>([])
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
          <div className="flex flex-col items-center justify-start text-center space-y-2 mb-8">
            <p className="text-lg font-medium">general ensurance values what matters - available now 👇</p>
            <p className="text-lg text-gray-500">specific ensurance protects what matters - coming soon 🚀</p>
          </div>
          <GeneralGrid 
            urlPrefix=""
            searchQuery={searchQuery}
            onDataChange={setMarketData}
          />
        </div>
      </div>
    </div>
  )
} 