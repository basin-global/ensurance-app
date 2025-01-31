'use client'

import { useAccount } from '@/modules/accounts/context'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'

export default function TendPage() {
  const { accountData } = useAccount()
  const keyword = accountData?.full_account_name?.split('.')[0] || ''

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 pt-0 pb-4 flex-1">
        <div className="bg-[#111] rounded-lg shadow-md p-4 md:p-6">
          <CertificatesGrid
            searchQuery={keyword}
            hideSearch={true}
          />
        </div>
      </div>
    </div>
  )
} 