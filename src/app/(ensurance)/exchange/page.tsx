'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import ChainDropdown from '@/modules/shared/ChainDropdown'
import CertificatesGrid from '@/modules/certificates/components/CertificatesGrid'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth'

// Only use Base, Arbitrum, and Optimism for exchange
const EXCHANGE_ENABLED_CHAINS = ['base', 'arbitrum', 'optimism'] as const;

export default function ExchangePage() {
  const { authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const [selectedChain, setSelectedChain] = useState<(typeof EXCHANGE_ENABLED_CHAINS)[number]>('base')
  const walletAddress = wallets?.[0]?.address

  if (!authenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Connect to Exchange</h1>
          <p className="text-gray-400 mb-6">Convert certificates to $ENSURE</p>
          <button
            onClick={() => login()}
            className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
          >
            CONNECT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Exchange Certificates</h1>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Certificates Grid */}
          <div className="lg:col-span-2">
            <Card className="bg-primary-dark border-gray-800 p-6">
              <div className="mb-6">
                <ChainDropdown
                  selectedChain={selectedChain}
                  onChange={(chain) => setSelectedChain(chain as typeof selectedChain)}
                  filterEnsurance={true}
                  className="w-[200px]"
                />
              </div>
              <CertificatesGrid
                walletAddress={walletAddress}
                variant="exchange"
                hideSearch={false}
                selectedChain={selectedChain}
              />
            </Card>
          </div>

          {/* Right Panel - Exchange Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-primary-dark border-gray-800 p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-4">Exchange Summary</h2>
              <div className="space-y-4">
                <p className="text-gray-400">Select certificates to exchange for $ENSURE</p>
                {/* Summary content will go here */}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 