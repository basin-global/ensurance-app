'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { isAppAdmin } from '@/config/admin'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { formatEther } from 'viem'
import SitusOG from '@/abi/SitusOG.json'
import { useGroupsData, type GroupData } from '@/hooks/useGroupsData'

interface ContractSettings {
  totalSupply: string
  tldOwner: string
  buyingEnabled: boolean
  price: string
  priceUsd: string
  metadataAddress: string
  minter: string
  referral: string
  royalty: string
  royaltyFeeReceiver: string
  royaltyFeeUpdater: string
  nameMaxLength: string
  buyingDisabledForever: boolean
  metadataFrozen: boolean
}

interface GroupSettings {
  [groupName: string]: ContractSettings | null
}

// Helper to truncate addresses
const truncateAddress = (address: string) => {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

// Helper to format percentage values (basis points to percentage)
const formatPercentage = (basisPoints: bigint) => {
  return `${(Number(basisPoints) / 100).toFixed(2)}%`
}

export default function AdminGroupsPage() {
  const { user } = usePrivy()
  const { groups, totalGroups, activeGroups, inactiveGroups } = useGroupsData(true)
  const [groupSettings, setGroupSettings] = useState<GroupSettings>({})
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [ethPrice, setEthPrice] = useState<number>(0)

  // Create public client with fallback transports
  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  const publicClient = createPublicClient({
    chain: base,
    transport: http(alchemyApiKey 
      ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
      : 'https://mainnet.base.org'
    )
  })

  // Fetch ETH price
  const fetchEthPrice = async () => {
    try {
      const response = await fetch('/api/eth-price')
      if (!response.ok) throw new Error('Failed to fetch ETH price')
      const data = await response.json()
      setEthPrice(data.price)
    } catch (err) {
      console.error('Error fetching ETH price:', err)
      setEthPrice(0)
    }
  }

  // Groups data is now handled by the useGroupsData hook

  // Retry function with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        // If it's a rate limit error, wait and retry
        if (error instanceof Error && error.message.includes('429')) {
          const delayMs = baseDelay * Math.pow(2, i) + Math.random() * 1000
          console.log(`Rate limit hit, retrying in ${delayMs}ms...`)
          await delay(delayMs)
          continue
        }
        
        // For other errors, don't retry
        throw error
      }
    }
    
    throw lastError || new Error('Maximum retries exceeded')
  }

  // Fetch contract settings for a single group
  const fetchGroupSettings = async (group: GroupData): Promise<ContractSettings | null> => {
    try {
      const contractAddress = group.contract_address as `0x${string}`
      
      // Read all contract functions with retry logic
      const [
        totalSupply,
        tldOwner,
        buyingEnabled,
        price,
        metadataAddress,
        minter,
        referral,
        royalty,
        royaltyFeeReceiver,
        royaltyFeeUpdater,
        nameMaxLength,
        buyingDisabledForever,
        metadataFrozen
      ] = await Promise.all([
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'totalSupply'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'owner'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'buyingEnabled'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'price'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'metadataAddress'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'minter'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'referral'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'royalty'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'royaltyFeeReceiver'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'royaltyFeeUpdater'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'nameMaxLength'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'buyingDisabledForever'
        })),
        retryWithBackoff(() => publicClient.readContract({
          address: contractAddress,
          abi: SitusOG,
          functionName: 'metadataFrozen'
        }))
      ])

      const priceInEth = formatEther(price as bigint)
      const priceInUsd = ethPrice > 0 ? (parseFloat(priceInEth) * ethPrice).toFixed(2) : '0.00'

      return {
        totalSupply: (totalSupply as bigint).toString(),
        tldOwner: truncateAddress(tldOwner as string),
        buyingEnabled: buyingEnabled as boolean,
        price: `${priceInEth} ETH`,
        priceUsd: `$${priceInUsd}`,
        metadataAddress: truncateAddress(metadataAddress as string),
        minter: truncateAddress(minter as string),
        referral: formatPercentage(referral as bigint),
        royalty: formatPercentage(royalty as bigint),
        royaltyFeeReceiver: truncateAddress(royaltyFeeReceiver as string),
        royaltyFeeUpdater: truncateAddress(royaltyFeeUpdater as string),
        nameMaxLength: (nameMaxLength as bigint).toString(),
        buyingDisabledForever: buyingDisabledForever as boolean,
        metadataFrozen: metadataFrozen as boolean
      }
    } catch (err) {
      console.error(`Error fetching settings for ${group.group_name}:`, err)
      return null
    }
  }

    // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Fetch all group settings with rate limiting
  const fetchAllGroupSettings = async () => {
    if (groups.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const settings: GroupSettings = {}
      const batchSize = 3 // Process 3 groups at a time to avoid rate limits
      const delayMs = 1000 // 1 second delay between batches
      
      // Process groups in batches
      for (let i = 0; i < groups.length; i += batchSize) {
        const batch = groups.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(groups.length / batchSize)
        
        setLoadingStatus(`Processing batch ${batchNum}/${totalBatches}...`)
        console.log(`Processing batch ${batchNum}/${totalBatches}`)
        
        // Process this batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (group) => ({
            groupName: group.group_name,
            settings: await fetchGroupSettings(group)
          }))
        )

        // Update settings object
        batchResults.forEach(({ groupName, settings: contractSettings }) => {
          settings[groupName] = contractSettings
        })

        // Update UI with partial results
        setGroupSettings(prev => ({ ...prev, ...settings }))

        // Delay before next batch (except for the last batch)
        if (i + batchSize < groups.length) {
          setLoadingStatus(`Waiting before next batch...`)
          await delay(delayMs)
        }
      }

      setGroupSettings(settings)
    } catch (err) {
      console.error('Error fetching group settings:', err)
      setError('Failed to fetch group settings')
    } finally {
      setLoading(false)
      setLoadingStatus('')
    }
  }

  // Load ETH price on component mount
  useEffect(() => {
    if (user?.wallet?.address) {
      fetchEthPrice()
    }
  }, [user?.wallet?.address])

  // Load group settings when groups change
  useEffect(() => {
    if (groups.length > 0) {
      fetchAllGroupSettings()
    }
  }, [groups])

  // Only show page to admins
  if (!isAppAdmin(user?.wallet?.address)) {
    return <div className="p-8">Access denied</div>
  }

  const sortedGroups = [...groups].sort((a, b) => a.group_name.localeCompare(b.group_name))

  // Calculate summary statistics
  const buyingEnabledCount = Object.values(groupSettings).filter(settings => settings?.buyingEnabled).length
  const totalAgentAccounts = Object.values(groupSettings).reduce((sum, settings) => {
    if (settings?.totalSupply) {
      return sum + parseInt(settings.totalSupply, 10)
    }
    return sum
  }, 0)
  const settingsLoaded = Object.keys(groupSettings).length

  const functionLabels = [
    'totalSupply',
    'tldOwner',
    'buyingEnabled',
    'price',
    'priceUsd',
    'metadataAddress',
    'minter',
    'referral',
    'royalty',
    'royaltyFeeReceiver',
    'royaltyFeeUpdater',
    'nameMaxLength',
    'buyingDisabledForever',
    'metadataFrozen'
  ]

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Group Contract Settings</h1>
        <div className="flex items-center space-x-4">
          {loading && loadingStatus && (
            <span className="text-sm text-gray-400">{loadingStatus}</span>
          )}
          <button
            onClick={fetchAllGroupSettings}
            disabled={loading || groups.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{totalGroups}</div>
          <div className="text-sm text-gray-400">Total Groups</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{activeGroups}</div>
          <div className="text-sm text-gray-400">Active Groups</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{inactiveGroups}</div>
          <div className="text-sm text-gray-400">Inactive Groups</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{settingsLoaded}</div>
          <div className="text-sm text-gray-400">Settings Loaded</div>
        </div>
      </div>

      {/* Contract Settings Summary */}
      {settingsLoaded > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xl font-bold text-green-400">{buyingEnabledCount}</div>
            <div className="text-sm text-gray-400">Groups with Buying Enabled</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xl font-bold text-blue-400">{totalAgentAccounts.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total Agent Accounts</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 text-red-400 rounded mb-6">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No active groups found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-700 bg-gray-900/50 rounded-lg">
            <thead>
              <tr className="bg-gray-800">
                <th className="sticky left-0 z-10 bg-gray-800 border border-gray-700 px-4 py-2 text-left text-white font-medium">
                  Function
                </th>
                {sortedGroups.map((group) => (
                  <th key={group.group_name} className="border border-gray-700 px-4 py-2 text-left text-white font-medium min-w-[120px]">
                    {group.group_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Contract addresses row */}
              <tr className="bg-gray-800/50">
                <td className="sticky left-0 z-10 bg-gray-800/50 border border-gray-700 px-4 py-2 font-medium text-gray-300">
                  contract_address
                </td>
                {sortedGroups.map((group) => (
                  <td key={group.group_name} className="border border-gray-700 px-4 py-2 text-gray-200 font-mono text-sm">
                    {truncateAddress(group.contract_address)}
                  </td>
                ))}
              </tr>

              {/* Is Active row */}
              <tr className="bg-gray-800/50">
                <td className="sticky left-0 z-10 bg-gray-800/50 border border-gray-700 px-4 py-2 font-medium text-gray-300">
                  is_active
                </td>
                {sortedGroups.map((group) => (
                  <td key={group.group_name} className="border border-gray-700 px-4 py-2 text-gray-200">
                    <span className={group.is_active ? 'text-green-400' : 'text-red-400'}>
                      {group.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Function rows */}
              {functionLabels.map((functionName) => (
                <tr key={functionName} className="hover:bg-gray-800/30">
                  <td className="sticky left-0 z-10 bg-gray-900/50 hover:bg-gray-800/30 border border-gray-700 px-4 py-2 font-medium text-gray-300">
                    {functionName}
                  </td>
                  {sortedGroups.map((group) => {
                    const settings = groupSettings[group.group_name]
                    const value = settings?.[functionName as keyof ContractSettings]
                    
                    return (
                      <td key={group.group_name} className="border border-gray-700 px-4 py-2 text-gray-200">
                        {loading ? (
                          <div className="animate-pulse bg-gray-700 h-4 rounded w-16"></div>
                        ) : !settings ? (
                          <span className="text-red-400">Error</span>
                        ) : typeof value === 'boolean' ? (
                          <span className={
                            // Reverse colors for these fields (No should be green)
                            functionName === 'buyingDisabledForever' || functionName === 'metadataFrozen'
                              ? (!value ? 'text-green-400' : 'text-red-400')
                              : (value ? 'text-green-400' : 'text-red-400')
                          }>
                            {value ? 'Yes' : 'No'}
                          </span>
                        ) : (
                          <span className="font-mono text-sm">{String(value)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 