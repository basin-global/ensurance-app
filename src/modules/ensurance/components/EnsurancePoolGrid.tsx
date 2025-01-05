'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSite } from '@/contexts/site-context'
import AccountImage from '@/modules/accounts/AccountImage'
import { cn } from '@/lib/utils'
import { poolNameMappings } from '@/modules/ensurance/poolMappings'

interface Account {
    full_account_name: string;
    token_id: number;
    og_name: string;
    is_agent: boolean;
}

interface EnsurancePoolGridProps {
    groupName?: string;
    searchQuery?: string;
    activeCategory: 'all' | 'Ecosystems' | 'Core Benefits';
    urlPrefix?: string;
}

type Category = 'all' | 'Ecosystems' | 'Core Benefits'

interface PoolMapping {
  displayName: string;
  category: 'Ecosystems' | 'Core Benefits';
}

export default function EnsurancePoolGrid({ 
  groupName, 
  searchQuery = '', 
  activeCategory,
  urlPrefix = ''
}: EnsurancePoolGridProps) {
    const site = useSite()
    const isDev = process.env.NODE_ENV === 'development'
    
    const getPathPrefix = () => {
        if (site !== 'onchain-agents') return '';
        return isDev ? '/site-onchain-agents' : '';
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

    const getDisplayName = (fullAccountName: string): string => {
        const mapping = poolNameMappings[fullAccountName];
        return mapping ? mapping.displayName : fullAccountName;
    }

    const getCategory = (fullAccountName: string): string => {
        const mapping = poolNameMappings[fullAccountName];
        return mapping ? mapping.category : '';
    }

    if (loading) return <div>Loading pools...</div>
    if (error) return <div className="text-red-500">{error}</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {accounts
                .filter(account => {
                    if (activeCategory === 'all') return true;
                    return getCategory(account.full_account_name) === activeCategory;
                })
                .filter(account => account.full_account_name !== 'situs.ensurance')
                .filter(account => {
                    if (!searchQuery) return true;
                    const displayName = getDisplayName(account.full_account_name).toLowerCase();
                    return displayName.includes(searchQuery.toLowerCase());
                })
                .sort((a, b) => getDisplayName(a.full_account_name)
                    .localeCompare(getDisplayName(b.full_account_name)))
                .map((account) => (
                    <Link
                        key={account.token_id}
                        href={`${urlPrefix}/${account.full_account_name}`}
                        className="bg-background-light dark:bg-background-dark rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                        <div className="aspect-video relative">
                            <AccountImage
                                tokenId={account.token_id}
                                groupName={groupName || 'default'}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-4">
                            <h3 className="text-lg font-semibold mb-1">
                                {getDisplayName(account.full_account_name)}
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