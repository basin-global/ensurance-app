import { TabbedModules } from '@/modules/shared/TabbedModules'
import AccountImage from '@/modules/accounts/AccountImage'

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: { account: string };
  searchParams: { module?: string; chain?: string };
}) {
  const accountName = params.account
  const [name, group] = accountName.split('.')
  
  // Fetch account data from API
  const response = await fetch(`/api/groups/${group}/accounts/${name}`)
  const accountData = await response.json()

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gray-800 rounded-full">
          <AccountImage 
            tokenId={accountData.token_id}
            groupName={group}
            variant="circle"
            className="bg-gray-800"
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {accountName}
          </h2>
        </div>
      </div>

      <TabbedModules
        address={accountName}
        isTokenbound={true}
        isOwner={false}
        initialModule={searchParams.module}
        initialChain={searchParams.chain}
      />
    </div>
  )
} 