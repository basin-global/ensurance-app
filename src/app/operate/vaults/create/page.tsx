'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useSite } from '@/contexts/site-context'
import { isSite } from '@/config/routes'
import { isAdmin } from '@/config/admin'
import Link from 'next/link'

function CreateVaultForm({ authenticated, address }: { authenticated: boolean, address?: string }) {
  if (!authenticated) {
    return <p className="text-gray-400">Please connect your wallet</p>
  }

  if (!isAdmin(address)) {
    return <p className="text-gray-400">Only admins can create vaults</p>
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 mb-4">Create a new vault for your agent operations</p>
      
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        onClick={() => alert('Vault creation coming soon!')}
      >
        Create Vault
      </button>
    </div>
  )
}

export default function CreateVaultPage() {
  const { authenticated, user } = usePrivy()
  const site = useSite()

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/operate/vaults"
          className="text-gray-400 hover:text-gray-300 mr-4"
        >
          ← Back to Vaults
        </Link>
        <h1 className="text-2xl font-bold">Create Operator Vault</h1>
      </div>

      <CreateVaultForm 
        authenticated={authenticated} 
        address={user?.wallet?.address}
      />
    </div>
  )
} 