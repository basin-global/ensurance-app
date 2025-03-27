'use client'

import { useState } from 'react'
import { PageHeader } from "@/components/layout/PageHeader"
import GeneralGrid from '@/modules/general/GeneralGrid'

export default function GeneralPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <PageHeader 
          title="general ensurance"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="what do you want to ensure?"
        />

        <GeneralGrid
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}