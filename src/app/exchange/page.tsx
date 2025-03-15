'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import ChainDropdown from '@/modules/shared/ChainDropdown'
import CertificatesGrid from '@/modules/certificates/components/CertificatesGrid'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth'
import { Asset } from '@/types'
import { Input } from "@/components/ui/input"
import { MinusCircle, PlusCircle } from 'lucide-react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Only use Base for exchange
const EXCHANGE_ENABLED_CHAINS = ['base'] as const;

interface SelectedCertificate {
  asset: Asset;
  selectedQuantity: number;
  maxQuantity: number;
}

export default function ExchangePage() {
  const { authenticated, login, user } = usePrivy()
  const { wallets } = useWallets()
  const [selectedChain, setSelectedChain] = useState<(typeof EXCHANGE_ENABLED_CHAINS)[number]>('base')
  const [selectedCertificates, setSelectedCertificates] = useState<Record<string, SelectedCertificate>>({})
  const [showComingSoon, setShowComingSoon] = useState(false)
  const walletAddress = user?.wallet?.address

  const handleCertificateSelect = (asset: Asset, selected: boolean) => {
    if (selected) {
      const quantity = asset.queried_wallet_balances?.[0]?.quantity || 0
      setSelectedCertificates(prev => ({
        ...prev,
        [asset.nft_id]: {
          asset,
          selectedQuantity: 1,
          maxQuantity: quantity
        }
      }))
    } else {
      setSelectedCertificates(prev => {
        const { [asset.nft_id]: removed, ...rest } = prev
        return rest
      })
    }
  }

  const updateQuantity = (nftId: string, newQuantity: number) => {
    setSelectedCertificates(prev => {
      const cert = prev[nftId]
      if (!cert) return prev

      if (newQuantity <= 0) {
        // Remove certificate if quantity is 0 or less
        const { [nftId]: removed, ...rest } = prev
        return rest
      }

      // Ensure quantity is within bounds
      const quantity = Math.min(newQuantity, cert.maxQuantity)
      
      return {
        ...prev,
        [nftId]: {
          ...cert,
          selectedQuantity: quantity
        }
      }
    })
  }

  // If not connected, show connect message
  if (!authenticated || !walletAddress) {
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
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Exchange Certificates</h1>
          <div className="ml-16">
            <ChainDropdown
              selectedChain={selectedChain}
              onChange={(chain) => {
                // Clear selected certificates when changing chains
                if (Object.keys(selectedCertificates).length > 0) {
                  if (confirm('Changing chains will clear your selected certificates. Continue?')) {
                    setSelectedCertificates({});
                    setSelectedChain(chain as typeof selectedChain);
                  }
                } else {
                  setSelectedChain(chain as typeof selectedChain);
                }
              }}
              filterEnsurance={true}
              className="w-[200px] border-0"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Certificates Grid */}
          <div className="lg:col-span-2">
            <Card className="bg-primary-dark border-gray-800 p-6">
              <CertificatesGrid
                walletAddress={walletAddress}
                selectedChain={selectedChain}
                onSelect={handleCertificateSelect}
                selectedCertificates={selectedCertificates}
                variant="exchange"
              />
            </Card>
          </div>

          {/* Right Panel - Exchange Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-primary-dark border-gray-800 p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-4">Exchange Summary</h2>
              <div className="space-y-4">
                {Object.keys(selectedCertificates).length === 0 ? (
                  <p className="text-gray-400">Select certificates to exchange for $ENSURE</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(selectedCertificates).map(([nftId, cert]) => (
                      <div key={nftId} className="flex items-center gap-4 p-4 bg-black/20 rounded-lg">
                        <div className="w-16 h-16 relative rounded-md overflow-hidden">
                          <Image
                            src={cert.asset.image_url || '/assets/no-image-found.png'}
                            alt={cert.asset.name || 'Certificate'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{cert.asset.name}</p>
                            <button
                              onClick={() => handleCertificateSelect(cert.asset, false)}
                              className="text-gray-400 hover:text-white ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                if (cert.selectedQuantity <= 1) {
                                  handleCertificateSelect(cert.asset, false);
                                } else {
                                  updateQuantity(nftId, cert.selectedQuantity - 1);
                                }
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={cert.selectedQuantity === 0 ? "" : cert.selectedQuantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const input = e.target.value;
                                
                                // If empty, keep the current quantity in state but show empty input
                                if (input === '') {
                                  e.target.value = '';
                                  return;
                                }
                                
                                const val = parseInt(input);
                                if (!isNaN(val)) {
                                  if (val === 0) {
                                    handleCertificateSelect(cert.asset, false);
                                  } else {
                                    updateQuantity(nftId, Math.min(val, cert.maxQuantity));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // On blur, if the input is empty or invalid, reset to current quantity
                                const val = parseInt(e.target.value);
                                if (isNaN(val) || val < 1) {
                                  e.target.value = cert.selectedQuantity.toString();
                                }
                              }}
                              min={1}
                              max={cert.maxQuantity}
                              className="w-16 text-center bg-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => updateQuantity(nftId, cert.selectedQuantity + 1)}
                              disabled={cert.selectedQuantity >= cert.maxQuantity}
                              className="text-gray-400 hover:text-white disabled:opacity-50"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-400">
                              of {cert.maxQuantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                      onClick={() => setShowComingSoon(true)}
                    >
                      Exchange Selected
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="bg-[#111] border-gray-800">
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">Certificate exchange functionality will be available soon.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 