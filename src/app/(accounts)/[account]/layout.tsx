import { notFound } from 'next/navigation'
import AccountHeader from '@/modules/accounts/AccountHeader'
import { AccountNavigation } from '@/components/layout/AccountNavigation'
import { AccountProvider } from '@/modules/accounts/context'
import { accounts } from '@/lib/database/accounts'

interface AccountLayoutProps {
  children: React.ReactNode
  params: {
    account: string
  }
}

export default async function AccountLayout({ children, params }: AccountLayoutProps) {
  const accountData = await accounts.getByFullName(params.account)

  if (!accountData) {
    notFound()
  }
  
  return (
    <AccountProvider accountData={accountData}>
      <div className="container mx-auto px-4 py-8">
        <AccountHeader 
          accountName={accountData.full_account_name}
          tokenId={accountData.token_id}
          tbaAddress={accountData.tba_address}
          groupName={accountData.group_name}
          isAgent={accountData.is_agent}
          isPool={accountData.group_name === 'ensurance' && params.account !== 'situs.ensurance'}
          {...(accountData.group_name === 'ensurance' && params.account !== 'situs.ensurance' ? { displayName: accountData.display_name } : {})}
        />
        <AccountNavigation accountName={params.account} />
        <main className="mt-8">
          {children}
        </main>
      </div>
    </AccountProvider>
  )
} 