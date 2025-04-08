'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import FarcasterProvider from '@/components/FarcasterProvider'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export default function SimpleMiniAppCertificate({ 
  params 
}: { 
  params: { contract: string } 
}) {
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        // Use existing API endpoint
        const response = await fetch('/api/general')
        if (!response.ok) throw new Error('Failed to fetch certificates')
        const data = await response.json()
        
        // Find the specific certificate
        const cert = data.find((c: any) => c.contract_address === params.contract)
        if (!cert) throw new Error('Certificate not found')
        
        // Fetch metadata from token URI
        const metadataResponse = await fetch(convertIpfsUrl(cert.token_uri))
        if (!metadataResponse.ok) throw new Error('Failed to fetch metadata')
        const metadata = await metadataResponse.json()
        
        setCertificate({
          ...cert,
          image_url: convertIpfsUrl(metadata.image || metadata.content?.uri || FALLBACK_IMAGE)
        })
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCertificate()
  }, [params.contract])

  if (loading) {
    return (
      <FarcasterProvider>
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          Loading...
        </div>
      </FarcasterProvider>
    )
  }

  if (!certificate) {
    return (
      <FarcasterProvider>
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          Certificate not found
        </div>
      </FarcasterProvider>
    )
  }

  return (
    <FarcasterProvider>
      <div className="min-h-screen flex flex-col bg-black text-white p-4">
        <div className="max-w-2xl mx-auto w-full">
          {/* Certificate Image */}
          <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-6">
            <Image
              src={certificate.image_url || FALLBACK_IMAGE}
              alt={certificate.name}
              fill
              className="object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement
                img.src = FALLBACK_IMAGE
              }}
            />
          </div>

          {/* Certificate Details */}
          <h1 className="text-2xl font-bold mb-4">{certificate.name}</h1>
          
          {/* Market Data */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Market Cap</div>
              <div className="text-xl font-bold">${Number(certificate.market_cap || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Volume</div>
              <div className="text-xl font-bold">${Number(certificate.total_volume || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <a 
              href={`https://ensurance.app/general/${certificate.contract_address}`}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg text-center font-semibold hover:bg-blue-700"
            >
              View Full Details
            </a>
            <a 
              href={`https://ensurance.app/general/${certificate.contract_address}?action=trade`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg text-center font-semibold hover:bg-green-700"
            >
              Trade Now
            </a>
          </div>
        </div>
      </div>
    </FarcasterProvider>
  )
} 