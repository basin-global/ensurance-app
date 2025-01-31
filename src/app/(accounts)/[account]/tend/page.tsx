import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AccountHeader from '@/modules/accounts/AccountHeader'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'
import { sql } from '@vercel/postgres'
import { AccountNavigation } from '@/components/layout/AccountNavigation'
import { accounts } from '@/lib/database/queries/accounts'

export default async function AccountTendPage({
  params,
}: {
  params: { account: string }
}) {
  const accountName = params.account
  
  // Fetch account data directly using the database query
  let accountData;
  try {
    accountData = await accounts.getByFullName(accountName);
    if (!accountData) {
      notFound()
    }
  } catch (error) {
    console.error('Error fetching account data:', error)
    notFound()
  }

  const [name, group] = accountName.split('.')

  // Only use account_name for filtering - keeping it simple and focused
  const filterKeywords = name  // Just the account name (e.g. "beaver" or "elk")

  console.log('Account tend page - Filter keywords:', filterKeywords)

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
        <div className="bg-[#111] rounded-xl p-4">
          <CertificatesGrid
            searchQuery={filterKeywords}
            hideSearch={true}
            variant="tend"
          />
        </div>
      </div>
    </div>
  )
} 