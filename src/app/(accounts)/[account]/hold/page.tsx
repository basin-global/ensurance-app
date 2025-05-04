'use client'

import Portfolio from '@/modules/account-modules/portfolio'
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

  return (
    <div className="space-y-6">
      <Portfolio tbaAddress={accountData.tba_address} />
    </div>
  )
} 