'use client'

import { ChangeSale } from "@/modules/certificates/admin/ChangeSale"
import { CurrentSaleInfo } from "@/modules/certificates/admin/CurrentSaleInfo"
import { useState } from 'react'

export default function TokenAdminPage({ 
  params: { chain, tokenId } 
}: { 
  params: { chain: string; tokenId: string } 
}) {
  const [currentSaleType, setCurrentSaleType] = useState<"fixedPrice" | "erc20" | "allowlist" | "timed" | null>(null)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Controls for Certificate #{tokenId}</h1>
      
      <div className="space-y-6">
        {/* Current Sale Info */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <CurrentSaleInfo 
            tokenId={tokenId} 
            chain={chain} 
            onSaleTypeChange={setCurrentSaleType}
          />
        </section>

        {/* Sale Type Controls */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Sale Configuration</h2>
          <ChangeSale 
            tokenId={tokenId} 
            chain={chain} 
            currentSaleType={currentSaleType}
          />
        </section>
      </div>
    </div>
  )
} 