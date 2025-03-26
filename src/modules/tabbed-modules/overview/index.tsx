'use client'

import React, { useState, useEffect } from 'react'
import { isEnsuranceToken } from '@/modules/specific/config/ensurance'
import AccountStats from '@/modules/accounts/AccountStats'
// import SpecificGrid from '@/modules/specific/SpecificGrid'
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
          
          const response = await fetch('/api/accounts/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(statsPayload)
          });
          
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

      {/* Stats */}
      <AccountStats 
        variant="full"
        total_currency_value={currencySummary.totalValue}
        total_assets={assetSummary.totalCount}
        ensured_assets={assetSummary.ensuredCount}
        uniqueCount={assetSummary.uniqueCount}
        currencyCount={currencySummary.currencyCount}
        chains={currencySummary.chains}
        accountName={accountName}
        loading={loading}
        className="mb-1"
      />

      {/* Full Width Certificates Grid */}
      <div className="lg:col-span-2">
        <div className="bg-gray-900/30 rounded-lg p-3">
          <h3 className="text-lg font-medium text-gray-200 mb-1">Related Certificates</h3>
          <div className="text-sm text-gray-400">
            Certificate grid coming soon...
          </div>
        </div>
      </div>
    </div>
  )
}