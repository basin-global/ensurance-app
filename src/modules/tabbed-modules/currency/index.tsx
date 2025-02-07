'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Send, ArrowLeftRight, DollarSign } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { getChainIcon, chainOrder } from '@/config/chains'
import { EnsureOperation } from '@/types'
import { 
  formatNumber, 
  getAppropriateDecimals, 
  getChainDisplayName,
  isNativeToken,
  transformTokenToAsset,
  type TokenBalance,
  type GroupedBalances
} from './utils'

interface CurrencyTabProps {
  address: string
  selectedChain: string
  isOwner?: boolean
}

export default function CurrencyTab({ address, selectedChain, isOwner = false }: CurrencyTabProps) {
  const [groupedBalances, setGroupedBalances] = useState<GroupedBalances>({})
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Fetching balances for address:', address)
      const response = await fetch(`/api/simplehash/native-erc20?address=${address}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Raw API response:', JSON.stringify(data, null, 2))
      const fetchedBalances = data.groupedBalances
      setEthPrice(data.ethPrice)
      console.log('Chains in fetched balances:', Object.keys(fetchedBalances))
      
      setGroupedBalances(fetchedBalances)
    } catch (error) {
      console.error('Error fetching balances:', error)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const filteredBalances = selectedChain === 'all'
    ? groupedBalances
    : { [selectedChain]: groupedBalances[selectedChain] || [] }

  const sortedChains = Object.keys(filteredBalances).sort((a, b) => 
    chainOrder.indexOf(a) - chainOrder.indexOf(b)
  )

  if (loading) {
    return <div>Loading...</div>
  }

  if (sortedChains.length === 0) {
    return <div>No currency balances found</div>
  }

  return (
    <div className="space-y-8 w-full">
      {sortedChains.map((chain) => (
        <div key={chain} className="overflow-x-auto w-full">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Image
              src={getChainIcon(chain)}
              alt={`${getChainDisplayName(chain)} icon`}
              width={24}
              height={24}
              className="mr-2"
            />
            {getChainDisplayName(chain)}
          </h3>
          
          {chain === 'polygon' ? (
            <table className="w-full bg-primary-dark border-gray-800 rounded-lg overflow-hidden [&_td]:border-gray-800 [&_th]:border-gray-800">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-300">Token</th>
                  <th className="px-4 py-2 text-left text-gray-300">Balance</th>
                  <th className="px-4 py-2 text-left text-gray-300">USD Value</th>
                  <th className="px-4 py-2 text-left text-gray-500">Price</th>
                  <th className="px-4 py-2 text-left text-gray-500">Source</th>
                  <th className="px-4 py-2 text-right text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances[chain].map((token) => {
                  const balance = Number(token.queried_wallet_balances[0].quantity_string) / Math.pow(10, token.decimals)
                  const balanceDecimals = getAppropriateDecimals(balance)
                  const price = isNativeToken(token) ? 
                    (token.queried_wallet_balances[0]?.value_usd_string && balance ? 
                      Number(token.queried_wallet_balances[0].value_usd_string) / balance : 
                      0) :
                    (token.prices && token.prices.length > 0 ? Number(token.prices[0].value_usd_string) : 0)
                  const priceDecimals = getAppropriateDecimals(price)

                  return (
                    <tr key={token.symbol} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2 text-left">
                        <span className="font-medium">{token.symbol}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {formatNumber(balance || 0, balanceDecimals)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        ${formatNumber(token.queried_wallet_balances[0]?.value_usd_string || 0, 2)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                        {isNativeToken(token) && token.symbol === 'POL' ? 
                          'Coming Soon' :
                          (price > 0 ? `$${formatNumber(price, priceDecimals)}` : 'N/A')
                        }
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {isNativeToken(token) ? 
                          getChainDisplayName(chain) :
                          (token.prices && token.prices.length > 0 ? token.prices[0].marketplace_name : 'N/A')
                        }
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                          <span className="sr-only">Actions</span>
                          <Send className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : filteredBalances[chain].length > 0 ? (
            <table className="w-full bg-primary-dark border-gray-800 rounded-lg overflow-hidden [&_td]:border-gray-800 [&_th]:border-gray-800">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-300">Token</th>
                  <th className="px-4 py-2 text-left text-gray-300">Balance</th>
                  <th className="px-4 py-2 text-left text-gray-300">USD Value</th>
                  <th className="px-4 py-2 text-left text-gray-500">Price</th>
                  <th className="px-4 py-2 text-left text-gray-500">Source</th>
                  <th className="px-4 py-2 text-right text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances[chain].map((token) => {
                  const balance = Number(token.queried_wallet_balances[0].quantity_string) / Math.pow(10, token.decimals)
                  const balanceDecimals = getAppropriateDecimals(balance)
                  const price = token.prices && token.prices.length > 0 ? Number(token.prices[0].value_usd_string) : 0
                  const priceDecimals = getAppropriateDecimals(price)

                  return (
                    <tr key={token.symbol} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2 text-left">
                        <span className="font-medium">{token.symbol}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {formatNumber(balance || 0, balanceDecimals)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        ${formatNumber(token.queried_wallet_balances[0]?.value_usd_string || 0, 2)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                        {price > 0 ? `$${formatNumber(price, priceDecimals)}` : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {token.prices && token.prices.length > 0 ? token.prices[0].marketplace_name : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                          <span className="sr-only">Actions</span>
                          <Send className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      ))}
    </div>
  )
} 