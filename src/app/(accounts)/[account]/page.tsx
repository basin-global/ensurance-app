import { TabbedModules } from '@/modules/shared/TabbedModules'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'
import { SubNavigation } from '@/components/layout/SubNavigation'

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

  const responseClone = response.clone();
  console.log('Page Component - Raw response:', await responseClone.json());
  
  const accountData = await response.json()
  console.log('Page Component - Account data:', accountData);
  console.log('Page Component - Description:', accountData?.description);
  const [name, group] = accountName.split('.')

  return (
    <div className="flex flex-col min-h-screen">
      <SubNavigation type="accounts" />
      
      <div className="container mx-auto px-4 -mt-6 pl-14">
        <AccountHeader 
          accountName={accountName}
          tokenId={accountData.token_id}
          tbaAddress={accountData.tba_address}
          groupName={group}
          description={accountData.description}
          isAgent={accountData.is_agent}
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