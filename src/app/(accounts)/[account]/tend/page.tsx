'use client'

import { useAccount } from '@/modules/accounts/context'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'

export default function TendPage() {
  const { accountData } = useAccount()
  const keyword = accountData?.full_account_name
    ?.split('.')[0]
    ?.split('-')
    ?.filter(Boolean)
    ?.join(' ') || ''

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="bg-[#111] rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              Purchase these certificates to ensure {accountData.is_agent ? "this agent's work" : accountData.pool_type ? "this pool" : "this account"}
            </p>
          </div>
          <CertificatesGrid
            searchQuery={keyword}
            hideSearch={true}
            variant="tend"
          />
        </div>
      </div>
    </div>
  )
} 