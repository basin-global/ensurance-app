'use client'

import ChatTab from '@/modules/tabbed-modules/chat'
import OverviewTab from '@/modules/tabbed-modules/overview'
import { useAccount } from '@/modules/accounts/context'

interface AccountPageProps {
  params: {
    account: string
  }
}

export default function AccountPage({ params }: AccountPageProps) {
  const { accountData, isOwner } = useAccount()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Chat */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            Chat With Agent
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
        </div>
        <ChatTab 
          address={accountData.tba_address}
          isOwner={isOwner}
          isAgent={accountData.is_agent}
        />
      </div>

      {/* Right Column - Overview */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            Account Overview
          </div>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-800 to-transparent" />
        </div>
        <OverviewTab
          description={accountData.description}
          tbaAddress={accountData.tba_address}
          isOwner={isOwner}
        />
      </div>
    </div>
  )
} 