'use client'

import React, { useState, useEffect } from 'react'
import { isEnsuranceToken } from '@/modules/ensurance/config'
import Link from 'next/link'

interface OverviewTabProps {
  description?: string
  tbaAddress: string
  isOwner?: boolean
}

interface AssetSummary {
  uniqueCount: number      // Number of unique NFTs (721 + 1155)
  totalCount: number       // Total including quantities
  ensuredCount: number     // Number of ensured assets
  nonEnsuredCount: number  // Number of non-ensured assets
}

interface CurrencySummary {
  totalValue: number
  currencyCount: number  // Number of unique currencies
  chains: string[]
}

export default function OverviewTab({ description, tbaAddress, isOwner }: OverviewTabProps) {
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({ 
    uniqueCount: 0, 
    totalCount: 0,
    ensuredCount: 0,
    nonEnsuredCount: 0
  })
  const [currencySummary, setCurrencySummary] = useState<CurrencySummary>({ totalValue: 0, currencyCount: 0, chains: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        // Fetch currency balances
        console.log('Fetching currency data for address:', tbaAddress)
        const currencyResponse = await fetch(`/api/simplehash/native-erc20?address=${tbaAddress}`)
        console.log('Currency response status:', currencyResponse.status)
        
        if (currencyResponse.ok) {
          const data = await currencyResponse.json()
          console.log('Currency data:', data)
          
          const chains = Object.keys(data.groupedBalances)
          let totalValue = 0
          let currencyCount = 0

          // Sum up values and count unique currencies across all chains
          chains.forEach(chain => {
            currencyCount += data.groupedBalances[chain].length
            data.groupedBalances[chain].forEach((token: any) => {
              totalValue += Number(token.queried_wallet_balances[0]?.value_usd_string || 0)
            })
          })

          setCurrencySummary({
            totalValue,
            currencyCount,
            chains
          })
        }

        // Fetch asset data
        console.log('Fetching NFT data for address:', tbaAddress)
        const assetResponse = await fetch(`/api/simplehash/nft?address=${tbaAddress}`)
        console.log('NFT response status:', assetResponse.status)
        
        if (assetResponse.ok) {
          const data = await assetResponse.json()
          console.log('NFT data:', data)
          
          let totalCount = 0
          let ensuredCount = 0
          let nonEnsuredCount = 0
          
          // Count total including quantities for ERC1155 and separate ensured/non-ensured
          data.nfts?.forEach((nft: any) => {
            const quantity = Number(nft.queried_wallet_balances?.[0]?.quantity_string || 1)
            console.log('NFT:', nft.name, 'Quantity:', quantity)
            totalCount += quantity

            // Check if it's an ensured asset
            if (isEnsuranceToken(nft.chain, nft.contract_address)) {
              ensuredCount++
            } else {
              nonEnsuredCount++
            }
          })

          setAssetSummary({
            uniqueCount: data.nfts?.length || 0,  // Unique NFTs
            totalCount,                           // Total including quantities
            ensuredCount,
            nonEnsuredCount
          })
        } else {
          const errorText = await assetResponse.text()
          console.error('NFT fetch error:', errorText)
        }
      } catch (error) {
        console.error('Error fetching summaries:', error)
      } finally {
        setLoading(false)
      }
    }

    if (tbaAddress) {
      console.log('Starting data fetch for address:', tbaAddress)
      fetchSummaries()
    } else {
      console.log('No tbaAddress provided')
      setLoading(false)
    }
  }, [tbaAddress])

  // Get the account name from the URL
  const accountName = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : ''

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading summaries...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Description */}
      {description && (
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">About</div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assets Stats */}
        <Link href={`/${accountName}/hold`} className="block">
          <div className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Assets</div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Total Portfolio</span>
                <span className="text-lg text-gray-200 tabular-nums">
                  {assetSummary.uniqueCount.toLocaleString()} unique
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Total Assets</span>
                <span className="text-lg text-gray-200 tabular-nums">
                  {assetSummary.totalCount.toLocaleString()} items
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Ensured Assets</span>
                <div className="flex flex-col items-end">
                  <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                    {assetSummary.ensuredCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {((assetSummary.ensuredCount / assetSummary.uniqueCount) * 100).toFixed(1)}% of portfolio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Currency Stats */}
        <Link href={`/${accountName}/hold?module=currency`} className="block">
          <div className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Currency</div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Total Value</span>
                <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                  ${currencySummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Currencies</span>
                <span className="text-lg text-gray-200 tabular-nums">
                  {currencySummary.currencyCount} across {currencySummary.chains.length} chains
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Coming Soon Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Place */}
        <Link href={`/${accountName}/presence?module=place`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-4 hover:bg-gray-900/50 transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Place</div>
            <div className="text-sm text-gray-500 italic">
              Data coming soon
            </div>
          </div>
        </Link>

        {/* Impact */}
        <Link href={`/${accountName}/presence?module=impact`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-4 hover:bg-gray-900/50 transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Impact</div>
            <div className="text-sm text-gray-500 italic">
              Data coming soon
            </div>
          </div>
        </Link>

        {/* Reputation */}
        <Link href={`/${accountName}/presence?module=reputation`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-4 hover:bg-gray-900/50 transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Reputation</div>
            <div className="text-sm text-gray-500 italic">
              Data coming soon
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 