import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CreatorEarning {
  amountUsd: string
  // Add other fields if needed
}

interface MarketData {
  total_volume?: string
  market_cap?: string
  creator_earnings?: CreatorEarning[]
}

interface MarketSummaryProps {
  title?: string
  data: MarketData[]
  className?: string
  variant?: 'default' | 'subtle'
}

// Format number with appropriate decimals
const formatNumber = (value: string | undefined) => {
  const num = Number(value || '0')
  return num.toLocaleString(undefined, {
    minimumFractionDigits: num < 10 ? 2 : 0,
    maximumFractionDigits: num < 10 ? 2 : 0
  })
}

export default function MarketSummary({ 
  title = "Market Summary",
  data,
  className = "",
  variant = 'default'
}: MarketSummaryProps) {
  // Calculate totals
  const totalVolume = data.reduce((sum, item) => sum + Number(item.total_volume || '0'), 0)
  const totalMarketCap = data.reduce((sum, item) => sum + Number(item.market_cap || '0'), 0)

  if (variant === 'subtle') {
    return (
      <div className={cn("text-right", className)}>
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-sm text-gray-400">market cap:</div>
            <div className="text-xl font-semibold text-white">${formatNumber(totalMarketCap.toString())}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">volume:</div>
            <div className="text-xl font-semibold text-white">${formatNumber(totalVolume.toString())}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">proceeds:</div>
            <div className="text-xl font-semibold text-white">${formatNumber(
              data.reduce((sum, item) => 
                sum + (item.creator_earnings || []).reduce((s, e) => s + Number(e.amountUsd || '0'), 0), 
                0
              ).toString()
            )}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card className="bg-primary-dark border-gray-800">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-400">market cap:</div>
              <div className="text-2xl font-bold text-white">${formatNumber(totalMarketCap.toString())}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">volume:</div>
              <div className="text-2xl font-bold text-white">${formatNumber(totalVolume.toString())}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">proceeds:</div>
              <div className="text-2xl font-bold text-white">${formatNumber(
                data.reduce((sum, item) => 
                  sum + (item.creator_earnings || []).reduce((s, e) => s + Number(e.amountUsd || '0'), 0), 
                  0
                ).toString()
              )}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 