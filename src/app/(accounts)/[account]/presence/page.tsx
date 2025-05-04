'use client'

import { PlaceTab, ImpactTab, ReputationTab } from '@/modules/account-modules'
import TabbedModules from '@/modules/account-modules'
import { useAccount } from '@/modules/accounts/context'
import VerificationSection from '@/components/layout/verifications/VerificationSection'

interface PresencePageProps {
  params: {
    account: string
  }
}

export default function PresencePage({ params }: PresencePageProps) {
  const { accountData, isOwner } = useAccount()

  // Handle loading state
  if (!accountData?.tba_address) {
    return (
      <div className="bg-[#111] rounded-xl p-4">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  const tabs = [
    {
      value: 'place',
      label: 'Place',
      component: PlaceTab,
      showChainDropdown: false
    },
    {
      value: 'impact',
      label: 'Impact',
      component: ImpactTab,
      showChainDropdown: false
    },
    {
      value: 'reputation',
      label: 'Reputation',
      component: ReputationTab,
      showChainDropdown: false
    }
  ]

  return (
    <div className="space-y-6">
      <TabbedModules 
        tabs={tabs}
        address={accountData.tba_address}
        isOwner={isOwner}
        label="PRESENCE"
      />
      <VerificationSection 
        type="account" 
        name={params.account} 
        group={params.account.split('.')[1]} 
      />
    </div>
  )
} 