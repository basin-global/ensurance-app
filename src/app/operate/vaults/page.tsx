'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useSite } from '@/contexts/site-context'
import { isSite } from '@/config/routes'
import Link from 'next/link'

function VaultsList({ authenticated }: { authenticated: boolean }) {
  if (!authenticated) {
    return <p className="text-gray-400">Please connect your wallet</p>
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400">No vaults created yet</p>
    </div>
  )
}

export default function VaultsPage() {
  const { authenticated } = usePrivy()
  const site = useSite()

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Operator Vaults</h1>
        <Link 
          href="/operate/vaults/create"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Create New Vault
        </Link>
      </div>
      
      <VaultsList authenticated={authenticated} />
    </div>
  )
} 