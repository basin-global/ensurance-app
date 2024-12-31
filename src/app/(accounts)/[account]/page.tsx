import { TabbedModules } from '@/modules/shared/TabbedModules'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'

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
      <div className="container mx-auto px-4">
        <AccountHeader 
          accountName={accountName}
          tokenId={accountData.token_id}
          tbaAddress={accountData.tba_address}
          groupName={group}
        />
      </div>

      <div className="flex-1 container mx-auto px-4">
        <TabbedModules
          address={accountData.tba_address}
          isOwner={false}
          initialModule={searchParams.module}
          initialChain={searchParams.chain}
        />
      </div>
    </div>
  )
} 