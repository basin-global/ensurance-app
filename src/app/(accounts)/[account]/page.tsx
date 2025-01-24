import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'
import ChatTab from '@/modules/tabbed-modules/chat'
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
        />
      </div>

      <div className="container mx-auto px-4 pl-14 pt-6">
        <AccountNavigation accountName={accountName} />
      </div>

      <div className="flex-1 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Chat */}
          <div className="bg-[#111] rounded-xl p-4">
            <div className="flex flex-col border-b border-gray-700 mb-4">
              <div className="px-2 md:px-4">
                <div className="flex flex-col items-start gap-1">
                  <div className="text-xs font-bold text-gray-400">
                    CHAT WITH AGENT
                  </div>
                  <div className="w-[175px] h-[2px] bg-gray-700 mb-1" />
                </div>
              </div>
            </div>
            <ChatTab 
              address={accountData.tba_address}
              isOwner={false}
            />
          </div>

          {/* Right Column - Overview */}
          <div className="bg-[#111] rounded-xl p-4">
            <div className="flex flex-col border-b border-gray-700 mb-4">
              <div className="px-2 md:px-4">
                <div className="flex flex-col items-start gap-1">
                  <div className="text-xs font-bold text-gray-400">
                    OVERVIEW
                  </div>
                  <div className="w-[175px] h-[2px] bg-gray-700 mb-1" />
                </div>
              </div>
            </div>

            <div className="space-y-6 p-2">
              {/* Description */}
              {accountData.description && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">About</div>
                  <p className="text-gray-400 text-sm">
                    {accountData.description}
                  </p>
                </div>
              )}

              {/* Asset Value */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Asset Value</div>
                <div className="text-2xl font-bold text-gray-300">Coming soon...</div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Certificates</div>
                  <div className="text-lg font-medium text-gray-300">--</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Reputation</div>
                  <div className="text-lg font-medium text-gray-300">--</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 