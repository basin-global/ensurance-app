'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import type { SyncEntity, SyncOptions, SyncOperationResult } from '@/modules/admin/sync/types'

// Available chains for sync
const CHAINS = ['base'] as const

export default function SyncPage() {
  const { user } = usePrivy()
  const [syncing, setSyncing] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<SyncEntity>('certificates')
  const [selectedType, setSelectedType] = useState<'general' | 'specific'>('general')
  const [selectedChain, setSelectedChain] = useState<string>('base')
  const [singleId, setSingleId] = useState('')
  const [result, setResult] = useState<SyncOperationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    if (!user?.wallet?.address) return
    
    setError(null)
    setSyncing(true)
    
    try {
      // Build sync options
      const options: SyncOptions = {
        entity: selectedEntity,
        chain: selectedChain
      }

      // Add type for certificates
      if (selectedEntity === 'certificates') {
        options.type = selectedType
      }

      // Add ID if specified
      if (singleId) {
        options.id = singleId
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
    } catch (err) {
      console.error('Sync error:', err)
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Sync</h1>

      <div className="space-y-6">
        {/* Entity Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Entity Type</label>
          <select 
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value as SyncEntity)}
            className="w-full p-2 bg-transparent border border-gray-700 rounded text-gray-200"
          >
            <option value="certificates">Certificates</option>
            <option value="accounts">Accounts</option>
            <option value="groups">Groups</option>
            <option value="syndicates">Syndicates</option>
          </select>
        </div>

        {/* Certificate Type (only for certificates) */}
        {selectedEntity === 'certificates' && (
          <div>
            <label className="block text-sm font-medium mb-2">Certificate Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'general' | 'specific')}
              className="w-full p-2 bg-transparent border border-gray-700 rounded text-gray-200"
            >
              <option value="general">General</option>
              <option value="specific">Specific</option>
            </select>
          </div>
        )}

        {/* Chain Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Chain</label>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="w-full p-2 bg-transparent border border-gray-700 rounded text-gray-200"
          >
            {CHAINS.map(chain => (
              <option key={chain} value={chain}>{chain}</option>
            ))}
          </select>
        </div>

        {/* Single Item ID */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Single Item ID (Optional)
            <span className="text-gray-400 text-xs ml-2">
              {selectedEntity === 'certificates' ? 'Contract Address' : 'Item ID'}
            </span>
          </label>
          <input
            type="text"
            value={singleId}
            onChange={(e) => setSingleId(e.target.value)}
            placeholder={selectedEntity === 'certificates' ? '0x...' : 'ID'}
            className="w-full p-2 bg-transparent border border-gray-700 rounded text-gray-200 placeholder-gray-500"
          />
        </div>

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