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
    <div className="flex flex-col items-center">
      <div className="text-[12px] flex justify-center gap-2">
        <Link
          href={`https://zora.co/coin/base:${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          zora
        </Link>
        <Link
          href={`https://basescan.org/token/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          basescan
        </Link>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        className="text-[12px] text-gray-400 hover:text-white transition-colors -mt-1"
      >
        {refreshing ? 'refreshing...' : 'refresh'}
      </Button>
    </div>
  )
} 