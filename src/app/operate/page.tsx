'use client'

import { usePrivy } from '@privy-io/react-auth'
import Link from 'next/link'

function OperateOptions({ authenticated }: { authenticated: boolean }) {
  if (!authenticated) {
    return <p className="text-gray-400">Please connect your wallet</p>
  }

  return (
    <div className="grid gap-4">
      <Link 
        href="/operate/vaults"
        className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <h2 className="text-xl font-bold mb-2">Manage Vaults</h2>
        <p className="text-gray-400">Create and manage server wallets for your agents</p>
      </Link>
      {/* Add more operator options here as needed */}
    </div>
  )
}

export default function OperatePage() {
  const { authenticated } = usePrivy()
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Operations Dashboard</h1>
      <OperateOptions authenticated={authenticated} />
    </div>
  )
} 