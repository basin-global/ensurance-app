'use client'

import { ChangeSale } from "@/modules/certificates/admin/ChangeSale"
import { CurrentSaleInfo } from "@/modules/certificates/admin/CurrentSaleInfo"
import { useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { isAppAdmin } from '@/config/admin'
import { SaleConfig } from '@/modules/certificates/strategies/types'

export default function TokenAdminPage({ 
  params: { chain, tokenId } 
}: { 
  params: { chain: string; tokenId: string } 
}) {
  const { ready, user } = usePrivy()
  const { wallets } = useWallets()
  const [currentSaleType, setCurrentSaleType] = useState<SaleConfig['saleType'] | null>(null)

  // Wait for Privy to initialize
  if (!ready) {
    return (
      <div className="animate-pulse">
        Initializing wallet connection...
      </div>
    )
  }

  // Check if wallet is connected and is admin
  if (!user?.wallet?.address || !isAppAdmin(user.wallet.address)) {
    return (
      <div className="text-red-400">
        Access denied. This page is only accessible to admin wallets.
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificate #{tokenId}</h1>
      </div>
      
      <div className="space-y-8">
        {/* Current Sale Info */}
        <section className="bg-gray-800 rounded-lg p-6">
          <CurrentSaleInfo 
            tokenId={tokenId} 
            chain={chain} 
            onSaleTypeChange={setCurrentSaleType}
          />
        </section>

        {/* Sale Configuration Controls */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Update Sale Configuration</h2>
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