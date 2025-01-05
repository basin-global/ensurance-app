'use client'

import { useState } from 'react'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SubNavigation } from '@/components/layout/SubNavigation'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'
import { useSite } from '@/contexts/site-context'

export default function CertificatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  const urlPrefix = site === 'onchain-agents' ? (isDev ? '/site-onchain-agents' : '') : ''

  return (
    <div className="min-h-screen flex flex-col">
      <SubNavigation type="ensurance" />
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
              urlPrefix={urlPrefix}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 