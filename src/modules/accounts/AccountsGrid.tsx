'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSite } from '@/contexts/site-context'

interface Account {
    full_account_name: string;
    token_id: number;
    og_name: string;
}

interface AccountsGridProps {
    groupName: string;
}

export default function AccountsGrid({ groupName }: AccountsGridProps) {
    const site = useSite()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch(`/api/groups/${groupName}/accounts`)
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                setAccounts(data)
            } catch (err) {
                setError('Failed to load accounts')
            } finally {
                setLoading(false)
            }
        }

        fetchAccounts()
    }, [groupName])

    const getAccountUrl = (accountName: string) => {
        const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
        return `${basePath}/${accountName}`
    }

    if (loading) return <div>Loading...</div>
    if (error) return <div className="text-red-500">{error}</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {accounts.map((account) => (
                <Link
                    key={account.token_id}
                    href={getAccountUrl(account.full_account_name)}
                    className="bg-primary dark:bg-primary-dark hover:bg-primary-dark dark:hover:bg-primary text-primary-foreground dark:text-primary-dark-foreground font-bold py-4 px-6 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 flex items-center"
                >
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-4 flex-shrink-0 bg-gray-200">
                        {/* Placeholder for account image */}
                    </div>
                    <span className="text-lg font-mono truncate">
                        {account.full_account_name}
                    </span>
                </Link>
            ))}
        </div>
    )
} 