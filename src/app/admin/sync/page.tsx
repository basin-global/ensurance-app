'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { isAppAdmin } from '@/config/admin'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SyncEntity, SyncOperationResult } from '@/modules/admin/sync/types'

export default function SyncPage() {
  const { user } = usePrivy()
  const [syncing, setSyncing] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<SyncEntity>('groups')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [tokenId, setTokenId] = useState('')
  const [result, setResult] = useState<SyncOperationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  const handleSync = async () => {
    if (!user?.wallet?.address) return
    
    setError(null)
    setSyncing(true)
    
    try {
      // Build sync options
      const options = {
        entity: selectedEntity,
        ...(selectedGroup !== 'all' && { group_name: selectedGroup }),
        ...(tokenId && { token_id: parseInt(tokenId) })
      }

      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-address': user.wallet.address
        },
        body: JSON.stringify(options)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      console.error('Sync error:', err)
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Fetch active groups from database
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user?.wallet?.address) return

      setLoadingGroups(true)
      try {
        const response = await fetch('/api/groups')
        if (!response.ok) {
          throw new Error('Failed to fetch groups')
        }

        const data = await response.json()
        setGroups(data)
      } catch (err) {
        console.error('Error fetching groups:', err)
      } finally {
        setLoadingGroups(false)
      }
    }

    fetchGroups()
  }, [user?.wallet?.address])

  // Only show page to admins
  if (!isAppAdmin(user?.wallet?.address)) {
    return <div className="p-8">Access denied</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Sync</h1>
      
      <div className="space-y-6">
        {/* Entity Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Entity Type</label>
          <Select
            value={selectedEntity}
            onValueChange={(value) => {
              setSelectedEntity(value as SyncEntity)
              setSelectedGroup('all')
              setTokenId('')
            }}
          >
            <SelectTrigger className="w-full bg-gray-900 text-white border-gray-700">
              <SelectValue placeholder="Choose an entity..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem 
                value="groups"
                className="text-white hover:bg-gray-800"
              >
                Groups
              </SelectItem>
              <SelectItem 
                value="accounts"
                className="text-white hover:bg-gray-800"
              >
                Accounts
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group Selection (only for accounts) */}
        {selectedEntity === 'accounts' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Group Name (Optional)
              <span className="text-gray-400 text-xs ml-2">
                Leave empty to sync all groups
              </span>
            </label>
            <Select
              value={selectedGroup}
              onValueChange={setSelectedGroup}
            >
              <SelectTrigger 
                className="w-full bg-gray-900 text-white border-gray-700"
                disabled={loadingGroups}
              >
                <SelectValue placeholder={loadingGroups ? "Loading groups..." : "Select a group..."} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem 
                  value="all"
                  className="text-white hover:bg-gray-800"
                >
                  All Groups
                </SelectItem>
                {groups.map(group => (
                  <SelectItem 
                    key={group.group_name}
                    value={group.group_name}
                    className="text-white hover:bg-gray-800"
                  >
                    {group.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Token ID (only for accounts with group selected) */}
        {selectedEntity === 'accounts' && selectedGroup && (
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Token ID (Optional)
              <span className="text-gray-400 text-xs ml-2">
                Leave empty to sync all accounts in group
              </span>
            </label>
            <input
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g. 1"
              className="w-full p-2 bg-gray-900 text-white border border-gray-700 rounded placeholder-gray-500"
            />
          </div>
        )}

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={syncing || !user?.wallet?.address}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
        >
          {syncing ? 'Syncing...' : 'Start Sync'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold">Sync Results</h2>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-gray-700 rounded bg-gray-900/50">
                <div className="text-2xl font-bold">{result.stats.total}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
              <div className="p-4 border border-green-700 rounded bg-green-900/50">
                <div className="text-2xl font-bold text-green-400">{result.stats.success}</div>
                <div className="text-sm text-gray-400">Success</div>
              </div>
              <div className="p-4 border border-red-700 rounded bg-red-900/50">
                <div className="text-2xl font-bold text-red-400">{result.stats.failed}</div>
                <div className="text-sm text-gray-400">Failed</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <div className="border border-gray-700 rounded bg-gray-900/50 p-4 overflow-auto max-h-96">
                <pre className="text-sm text-gray-300">
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 