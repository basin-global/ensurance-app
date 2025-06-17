'use client'

import { useAccount } from '@/modules/accounts/context'
import VerificationSection from '@/components/layout/verifications/VerificationSection'
import GeneralGrid from '@/modules/general/GeneralGrid'
import PortfolioList from '@/modules/account-modules/portfolio/components/PortfolioList'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { usePortfolioData } from '@/modules/account-modules/portfolio/hooks/usePortfolioData'

interface AccountPageProps {
  params: {
    account: string
  }
}

export default function AccountPage({ params }: AccountPageProps) {
  const { accountData, isOwner } = useAccount()
  const accountName = params.account.split('.')[0]
  const groupName = params.account.split('.')[1]
  const { tokens: portfolioTokens, isLoading: loadingPortfolio } = usePortfolioData(accountData?.tba_address || '')

  // Handle loading state
  if (!accountData?.tba_address) {
    return (
      <div className="bg-[#111] rounded-xl p-4">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* TEND Column */}
          <div className="bg-gray-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-medium text-gray-200">
                TEND
              </div>
              <Link 
                href={`/${params.account}/tend`}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Collecting and swapping these assets and currencies funds and ensures {params.account}'s work
            </div>
            <GeneralGrid 
              accountContext={{
                name: accountName,
                specific_asset_id: accountData.specific_asset_id
              }}
              isOverview={true}
              hideMarketData={true}
            />
            <div className="mt-4 pt-4 border-t border-gray-800">
              <Link 
                href={`/${params.account}/tend`}
                className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1"
              >
                View all certificates <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* HOLD Column */}
          <div className="bg-gray-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-medium text-gray-200">
                HOLD
              </div>
              <Link 
                href={`/${params.account}/hold`}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Assets and currencies that {params.account} holds and manages
            </div>
            {loadingPortfolio ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading portfolio...</div>
              </div>
            ) : (
              <>
                <PortfolioList 
                  tokens={portfolioTokens}
                  isOverview={true}
                  tbaAddress={accountData.tba_address}
                  account={params.account}
                />
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <Link 
                    href={`/${params.account}/hold`}
                    className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1"
                  >
                    View all assets <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <VerificationSection 
        type="account" 
        name={params.account} 
        group={groupName} 
      />
    </div>
  )
} 