'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AccountImage from '@/modules/accounts/AccountImage'
import { cn } from '@/lib/utils'

interface Account {
    full_account_name: string;
    token_id: number;
    og_name: string;
    is_agent: boolean;
    pool_type: string | null;
    display_name: string | null;
}

interface EnsurancePoolGridProps {
    groupName?: string;
    searchQuery?: string;
    activeCategory: 'all' | 'stocks' | 'flows';
    urlPrefix?: string;
}

export default function EnsurancePoolGrid({ 
  groupName, 
  searchQuery = '', 
  activeCategory,
  urlPrefix = ''
}: EnsurancePoolGridProps) {
    const getPathPrefix = () => {
        return urlPrefix || '';
    };

    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch('/api/accounts')
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                
                const filteredAccounts = groupName 
                    ? data.filter(account => account.og_name === `.${groupName}`)
                    : data;
                
                // For ensurance pools, we might want a different sorting strategy
                const sortedAccounts = filteredAccounts.sort((a, b) => {
                    return a.full_account_name.localeCompare(b.full_account_name);
                });
                
                setAccounts(sortedAccounts)
            } catch (err) {
                setError('Failed to load pools')
            } finally {
                setLoading(false)
            }
        }

        fetchAccounts()
    }, [groupName])

    const getDisplayName = (account: Account): string => {
        return account.display_name || account.full_account_name;
    }

    const getCategory = (account: Account): string => {
        if (!account.pool_type) return '';
        return account.pool_type === 'stock' ? 'stocks' : 'flows';
    }

    if (loading) return <div>Loading pools...</div>
    if (error) return <div className="text-red-500">{error}</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {accounts
                .filter(account => {
                    if (activeCategory === 'all') return true;
                    return getCategory(account) === activeCategory;
                })
                .filter(account => account.full_account_name !== 'situs.ensurance')
                .filter(account => {
                    if (!searchQuery) return true;
                    const displayName = getDisplayName(account).toLowerCase();
                    return displayName.includes(searchQuery.toLowerCase());
                })
                .sort((a, b) => getDisplayName(a)
                    .localeCompare(getDisplayName(b)))
                .map((account) => (
                    <Link
                        key={account.token_id}
                        href={`${getPathPrefix()}/${account.full_account_name}`}
                        className="bg-background-light dark:bg-background-dark rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col items-center p-6"
                    >
                        <div className="aspect-square relative w-64 h-64">
                            <AccountImage
                                tokenId={account.token_id}
                                groupName={groupName || 'default'}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                        <div className="p-4 text-center">
                            <h3 className="text-lg font-semibold mb-1">
                                {getDisplayName(account)}
                            </h3>
                            <p className="text-sm font-mono text-gray-500">
                                {account.full_account_name}
                            </p>
                        </div>
                    </Link>
                ))}
        </div>
    )
} 