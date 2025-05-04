'use client'

import VerificationSection from '@/components/layout/verifications/VerificationSection'
import { useAccount } from '@/modules/accounts/context'

interface TendPageProps {
  params: {
    account: string
  }
}

export default function TendPage({ params }: TendPageProps) {
  const { accountData, isOwner } = useAccount()

  // Handle loading state
  if (!accountData?.tba_address) {
    return (
      <div className="bg-[#111] rounded-xl p-4">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/30 rounded-lg p-3">
        <h3 className="text-lg font-medium text-gray-200 mb-1">Tend Certificates</h3>
        <p className="text-gray-400">Certificate tending functionality is being updated.</p>
      </div>
      <VerificationSection 
        type="account" 
        name={params.account} 
        group={params.account.split('.')[1]} 
      />
    </div>
  )
} 