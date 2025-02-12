'use client'

import { ChangeSale } from "@/modules/certificates/admin/ChangeSale"
import { CurrentSaleInfo } from "@/modules/certificates/admin/CurrentSaleInfo"
import { useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { isAdmin } from '@/config/admin'

export default function TokenAdminPage({ 
  params: { chain, tokenId } 
}: { 
  params: { chain: string; tokenId: string } 
}) {
  const { ready } = usePrivy()
  const { wallets } = useWallets()
  const [currentSaleType, setCurrentSaleType] = useState<"fixedPrice" | "erc20" | "allowlist" | "timed" | null>(null)

  // Wait for Privy to initialize
  if (!ready) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-4 bg-gray-900 rounded-lg animate-pulse">
          <p>Initializing wallet connection...</p>
        </div>
      </div>
    )
  }

  // Check if wallet is connected and is admin
  const connectedWallet = wallets[0]
  if (!connectedWallet || !isAdmin(connectedWallet.address)) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-4 bg-red-900/20 rounded-lg">
          <p className="text-red-400">Access denied. This page is only accessible to admin wallets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Controls for Certificate #{tokenId}</h1>
      
      <div className="space-y-6">
        {/* Current Sale Info - Public Data */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <CurrentSaleInfo 
            tokenId={tokenId} 
            chain={chain} 
            onSaleTypeChange={setCurrentSaleType}
          />
        </section>

        {/* Sale Type Controls - Requires Admin */}
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