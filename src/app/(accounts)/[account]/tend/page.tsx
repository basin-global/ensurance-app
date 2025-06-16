'use client'

import VerificationSection from '@/components/layout/verifications/VerificationSection'
import { useAccount } from '@/modules/accounts/context'
import GeneralGrid from '@/modules/general/GeneralGrid'

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

  // Extract account name without suffix
  const accountName = params.account.split('.')[0]
  const groupName = params.account.split('.')[1]

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/30 rounded-lg p-4">
        <h3 className="text-xl font-medium text-gray-200">
          Collecting and swapping these assets and currencies funds and ensures {params.account}'s work
        </h3>
      </div>
      <GeneralGrid 
        accountContext={{
          name: accountName,
          specific_asset_id: accountData.specific_asset_id
        }}
      />
      <VerificationSection 
        type="account" 
        name={params.account} 
        group={groupName} 
      />
    </div>
  )
} 