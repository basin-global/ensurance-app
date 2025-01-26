import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'
import ChatTab from '@/modules/tabbed-modules/chat'
import OverviewTab from '@/modules/tabbed-modules/overview'
import { AccountNavigation } from '@/components/layout/AccountNavigation'

export default async function AccountPage({
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

  return (
    <div className="flex flex-col min-h-screen">      
      <div className="container mx-auto px-4 pl-14 pt-8">
        <AccountHeader 
          accountName={accountName}
          tokenId={accountData.token_id}
          tbaAddress={accountData.tba_address}
          groupName={group}
          isAgent={accountData.is_agent}
          displayName={accountData.display_name}
          isPool={group === 'ensurance' && accountName !== 'situs.ensurance'}
        />
      </div>

      <div className="container mx-auto px-4 pl-14 pt-6">
        <AccountNavigation accountName={accountName} />
      </div>

      <div className="flex-1 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Chat */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                Chat Assistant
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
            </div>
            <ChatTab 
              address={accountData.tba_address}
              isOwner={false}
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
              isOwner={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 