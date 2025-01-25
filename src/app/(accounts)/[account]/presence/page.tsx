import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'
import TabbedModules, { PlaceTab, ImpactTab, ReputationTab } from '@/modules/tabbed-modules'
import { AccountNavigation } from '@/components/layout/AccountNavigation'

export default async function AccountIdentityPage({
  params,
  searchParams,
}: {
  params: { account: string };
  searchParams: { module?: string; chain?: string };
}) {
  const accountName = params.account
  const headersList = headers()
  const host = headersList.get('host') || ''
  
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  
  const response = await fetch(`${baseUrl}/api/accounts/${accountName}`, {
    next: { revalidate: 3600 }
  })
  
  if (!response.ok) {
    notFound()
  }
  
  const accountData = await response.json()
  const [name, group] = accountName.split('.')

  // Define identity tabs
  const identityTabs = [
    { value: 'place', label: 'place', component: PlaceTab, showChainDropdown: false },
    { value: 'impact', label: 'impact', component: ImpactTab, showChainDropdown: false },
    { value: 'reputation', label: 'reputation', component: ReputationTab, showChainDropdown: false }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto px-4 pl-14 pt-8">
        <AccountHeader 
          accountName={accountName}
          tokenId={accountData.token_id}
          tbaAddress={accountData.tba_address}
          groupName={group}
          isAgent={accountData.is_agent}
        />
      </div>

      <div className="container mx-auto px-4 pl-14 pt-6">
        <AccountNavigation accountName={accountName} />
      </div>

      <div className="flex-1 container mx-auto px-4">
        <div className="bg-[#111] rounded-xl p-4">
          <TabbedModules
            address={accountData.tba_address}
            isOwner={false}
            initialModule={searchParams.module || 'place'}
            initialChain={searchParams.chain}
            tabs={identityTabs}
          />
        </div>
      </div>
    </div>
  )
} 