'use client'

import { useAccount } from '@/modules/accounts/context'

export default function TendPage() {
  const { accountData } = useAccount()

  return (
    <div className="bg-gray-900/30 rounded-lg p-3">
      <h3 className="text-lg font-medium text-gray-200 mb-1">Tend Certificates</h3>
      <p className="text-gray-400">Certificate tending functionality is being updated.</p>
    </div>
  )
} 