'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import GeneralGrid from '@/modules/general/GeneralGrid'

export default function GeneralPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">General Certificates</h1>
          <div className="flex items-center gap-4">
            <Input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[300px] bg-gray-900 border-gray-700"
            />
          </div>
        </div>

        <GeneralGrid
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}