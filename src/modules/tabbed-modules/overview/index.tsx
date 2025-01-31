'use client'

import React, { useState, useEffect } from 'react'
import { isEnsuranceToken } from '@/modules/ensurance/config'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  const accountName = pathname.split('/')[1]
  const keyword = accountName
    ?.split('.')[0]
    ?.split('-')
    ?.filter(Boolean)
    ?.join(' ') || ''

  const [assetSummary, setAssetSummary] = useState<AssetSummary>({ 
    uniqueCount: 0, 
    totalCount: 0,
    ensuredCount: 0,
    nonEnsuredCount: 0
  })
  const [currencySummary, setCurrencySummary] = useState<CurrencySummary>({ totalValue: 0, currencyCount: 0, chains: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchSummaries() {
      if (!tbaAddress) return

      try {
        const [currencyResponse, assetResponse] = await Promise.all([
          fetch(`/api/simplehash/native-erc20?address=${tbaAddress}`),
          fetch(`/api/simplehash/nft?address=${tbaAddress}`)
        ])

        if (!currencyResponse.ok || !assetResponse.ok) {
          throw new Error('Failed to fetch summaries')
        }

        const currencyData = await currencyResponse.json()
        const assetData = await assetResponse.json()

        console.log('Raw currency data:', currencyData);
        console.log('Raw asset data:', assetData);

        // Calculate currency summary
        let totalValue = 0;
        let currencyCount = 0;
        const chains = Object.keys(currencyData.groupedBalances || {});

        chains.forEach(chain => {
          currencyData.groupedBalances[chain].forEach((token: any) => {
            const balance = Number(token.queried_wallet_balances[0]?.value_usd_string || 0)
            if (balance > 0) {
              currencyCount++
              totalValue += balance
            }
          })
        });

        console.log('Calculated currency summary:', { totalValue, currencyCount, chains });

        // Calculate asset summary
        const uniqueCount = assetData.nfts?.length || 0;
        let totalCount = 0;
        let ensuredCount = 0;
        let nonEnsuredCount = 0;

        assetData.nfts?.forEach((nft: any) => {
          const quantity = Number(nft.queried_wallet_balances?.[0]?.quantity_string || 1)
          totalCount += quantity

          if (isEnsuranceToken(nft.chain, nft.contract_address)) {
            ensuredCount++
          } else {
            nonEnsuredCount++
          }
        });

        console.log('Calculated asset summary:', {
          uniqueCount,
          totalCount,
          ensuredCount,
          nonEnsuredCount
        });

        if (isMounted) {
          setCurrencySummary({ totalValue, currencyCount, chains })
          setAssetSummary({
            uniqueCount,
            totalCount,
            ensuredCount,
            nonEnsuredCount
          })
        }

        // Update database stats
        try {
          const statsPayload = {
            account_name: accountName,
            stats: {
              total_currency_value: totalValue,
              total_assets: totalCount,
              ensured_assets: ensuredCount,
              stats_last_updated: new Date().toISOString()
            }
          };
          
          console.log('Sending stats update:', statsPayload);
          
          const response = await fetch('/api/accounts/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(statsPayload)
          });
          
          const result = await response.json();
          console.log('Stats update result:', result);
          
        } catch (error) {
          console.error('Failed to update stats in database:', error)
        }
      } catch (error) {
        console.error('Error fetching summaries:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSummaries()

    return () => {
      isMounted = false
    }
  }, [tbaAddress, accountName])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100px]">
        <div className="animate-pulse text-gray-400">Loading summaries...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Description */}
      {description && (
        <div className="bg-gray-900/50 rounded-lg p-2 mb-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">About</div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mb-1">
        {/* Assets Stats */}
        <Link href={`/${accountName}/hold`} className="block h-full">
          <div className="bg-gray-900/50 rounded-lg p-2 hover:bg-gray-900/70 transition-colors h-full">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assets</div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Total Portfolio</span>
                <span className="text-base text-gray-300 tabular-nums">
                  {assetSummary.uniqueCount.toLocaleString()} unique
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Total Assets</span>
                <span className="text-base text-gray-300 tabular-nums">
                  {assetSummary.totalCount.toLocaleString()} items
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Ensured Assets</span>
                <div className="flex flex-col items-end">
                  <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                    {assetSummary.ensuredCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {((assetSummary.ensuredCount / assetSummary.uniqueCount) * 100).toFixed(1)}% of portfolio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Currency Stats */}
        <Link href={`/${accountName}/hold?module=currency`} className="block h-full">
          <div className="bg-gray-900/50 rounded-lg p-2 hover:bg-gray-900/70 transition-colors h-full">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Currency</div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Total Value</span>
                <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                  ${Math.round(currencySummary.totalValue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Currencies</span>
                <span className="text-base text-gray-300 tabular-nums">
                  {currencySummary.currencyCount}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Chains</span>
                <span className="text-base text-gray-300 tabular-nums">
                  {currencySummary.chains.length}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Coming Soon Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        {/* Place */}
        <Link href={`/${accountName}/presence?module=place`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Place</div>
            <div className="text-xs text-gray-600 italic">
              Data coming soon
            </div>
          </div>
        </Link>

        {/* Impact */}
        <Link href={`/${accountName}/presence?module=impact`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Impact</div>
            <div className="text-xs text-gray-600 italic">
              Data coming soon
            </div>
          </div>
        </Link>

        {/* Reputation */}
        <Link href={`/${accountName}/presence?module=reputation`} className="block">
          <div className="bg-gray-900/30 rounded-lg p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Reputation</div>
            <div className="text-xs text-gray-600 italic">
              Data coming soon
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}