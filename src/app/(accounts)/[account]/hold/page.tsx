'use client'

import { AssetsTab, CurrencyTab } from '@/modules/tabbed-modules'
import TabbedModules from '@/modules/tabbed-modules'
import { useAccount } from '@/modules/accounts/context'

interface HoldPageProps {
  params: {
    account: string
  }
}

export default function HoldPage({ params }: HoldPageProps) {
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
      value: 'assets',
      label: 'Assets',
      component: AssetsTab,
      showChainDropdown: true
    },
    {
      value: 'currency',
      label: 'Currency',
      component: CurrencyTab,
      showChainDropdown: true
    }
  ]

  return (
    <TabbedModules 
      tabs={tabs}
      address={accountData.tba_address}
      isOwner={isOwner}
      label="PORTFOLIO"
    />
  )
} 