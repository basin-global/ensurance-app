'use client'

import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { getContractTokens, type TokenDisplayInfo } from './collect'
import { CONTRACTS } from './config'
import { cn } from "@/lib/utils"

interface SpecificMarketSummaryProps {
  variant?: 'default' | 'subtle'
  className?: string
}

export default function SpecificMarketSummary({ 
  variant = 'default',
  className = ""
}: SpecificMarketSummaryProps) {
  const [marketData, setMarketData] = useState<{
    policiesIssued: number
    certificatesIssued: bigint
    totalValueEnsured: bigint
  }>({
    policiesIssued: 0,
    certificatesIssued: BigInt(0),
    totalValueEnsured: BigInt(0)
  })

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const tokens = await getContractTokens(CONTRACTS.specific)
        
        // Calculate metrics
        const policiesIssued = tokens.length
        const certificatesIssued = tokens.reduce((sum, token) => sum + token.totalMinted, BigInt(0))
        const totalValueEnsured = tokens.reduce((sum, token) => {
          if (token.salesConfig?.pricePerToken) {
            return sum + (token.totalMinted * token.salesConfig.pricePerToken)
          }
          return sum
        }, BigInt(0))

        setMarketData({
          policiesIssued,
          certificatesIssued,
          totalValueEnsured
        })
      } catch (error) {
        console.error('Error fetching market data:', error)
      }
    }

    fetchMarketData()
  }, [])

  if (variant === 'subtle') {
    return (
      <div className={cn("text-right", className)}>
        <div className="flex flex-col gap-1">
          <div className="flex justify-end gap-6">
            <div>
              <div className="text-sm text-gray-400">policies issued</div>
              <div className="text-xl font-semibold text-white">{marketData.policiesIssued}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">certificates issued</div>
              <div className="text-xl font-semibold text-white">{marketData.certificatesIssued.toString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">total value ensured</div>
              <div className="text-xl font-semibold text-white">${formatUnits(marketData.totalValueEnsured, 6)}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">policies issued</span>
          <span className="font-medium text-white">{marketData.policiesIssued}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">certificates issued</span>
          <span className="font-medium text-white">{marketData.certificatesIssued.toString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">total value ensured</span>
          <span className="font-medium text-white">${formatUnits(marketData.totalValueEnsured, 6)}</span>
        </div>
      </div>
    </div>
  )
} 