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
    total_currency_value: number;
    total_assets: number;
    ensured_assets: number;
    stats_last_updated: string;
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
                        className="bg-background-light dark:bg-background-dark rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                    >
                        <div className="p-6">
                            <div className="aspect-square relative w-64 h-64 mx-auto">
                                <AccountImage
                                    tokenId={account.token_id}
                                    groupName={groupName || 'default'}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <h3 className="text-lg font-semibold mb-1">
                                    {getDisplayName(account)}
                                </h3>
                                <p className="text-sm font-mono text-gray-500 mb-4">
                                    {account.full_account_name}
                                </p>
                                
                                {/* Stats Section */}
                                <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                                    {/* Currency Stats */}
                                    <div className="bg-gray-900/50 rounded-lg p-3">
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Value</div>
                                        <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                                            ${Math.round(account.total_currency_value).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Asset Stats */}
                                    <div className="bg-gray-900/50 rounded-lg p-3">
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Assets</div>
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm text-gray-400">Total</span>
                                                <span className="text-lg text-gray-200 tabular-nums">
                                                    {account.total_assets?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-baseline mt-1">
                                                <span className="text-sm text-gray-400">Ensured</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                                                        {account.ensured_assets?.toLocaleString() || '0'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {account.total_assets ? ((account.ensured_assets / account.total_assets) * 100).toFixed(1) : '0'}% of total
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
        </div>
    )
} 