'use client'

import { useState } from 'react'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'

export default function CertificatesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="space-y-4">
          <div className="flex justify-center">
            <AssetSearch 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search certificates..."
            />
          </div>
          <div className="bg-[#111] rounded-lg shadow-md p-4 md:p-6">
            <CertificatesGrid
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 