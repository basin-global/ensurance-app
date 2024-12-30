import AccountsGrid from '@/modules/accounts/AccountsGrid'

export default function AllAccountsPage({ 
    params 
}: { 
    params: { group: string } 
}) {
    return (
        <div className="container mx-auto px-4 py-8">
            <AccountsGrid groupName={params.group} />
        </div>
    )
} 