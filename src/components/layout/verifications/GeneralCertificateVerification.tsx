'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"

interface Props {
  contractAddress: string
}

export default function GeneralCertificateVerification({ contractAddress }: Props) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/general?address=${contractAddress}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to refresh market data')
      }
      
      // Trigger a page refresh to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error refreshing market data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Certificate verification line */}
      <div className="flex justify-center">
        <Link
          href={`https://basescan.org/token/${contractAddress}#readProxyContract`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          certificate of ensurance
        </Link>
      </div>

      {/* Zora link line */}
      <div className="flex justify-center gap-2">
        <Link
          href={`https://zora.co/coin/base:${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          zora
        </Link>
        <Link
          href={`https://matcha.xyz/tokens/base/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          matcha
        </Link>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        className="text-[12px] text-gray-400 hover:text-white transition-colors"
      >
        {refreshing ? 'refreshing...' : 'refresh'}
      </Button>
    </div>
  )
} 