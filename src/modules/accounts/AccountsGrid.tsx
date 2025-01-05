'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSite } from '@/contexts/site-context'
import AccountImage from './AccountImage'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'

interface Account {
    full_account_name: string;
    token_id: number;
    og_name: string;
    is_agent: boolean;
}

interface AccountsGridProps {
    groupName?: string;
    searchQuery?: string;
    agentsOnly?: boolean;
}

export default function AccountsGrid({ 
    groupName, 
    searchQuery = '', 
    agentsOnly = false
}: AccountsGridProps) {
    const site = useSite()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 20

    const showOnlyAgents = site === 'onchain-agents' || agentsOnly

    // Memoized fetch function
    const fetchAccounts = useCallback(async () => {
        try {
            const response = await fetch('/api/accounts')
            if (!response.ok) throw new Error('Failed to fetch accounts')
            const data = await response.json()
            setAccounts(data)
        } catch (err) {
            setError('Failed to load accounts')
        } finally {
            setLoading(false)
        }
    }, [])

    // Initial fetch with cleanup
    useEffect(() => {
        let mounted = true;
        
        const load = async () => {
            try {
                const response = await fetch('/api/accounts')
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                if (mounted) {
                    setAccounts(data)
                    setLoading(false)
                }
            } catch (err) {
                if (mounted) {
                    setError('Failed to load accounts')
                    setLoading(false)
                }
            }
        }

        load()
        
        return () => {
            mounted = false
        }
    }, [])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [groupName, searchQuery, showOnlyAgents])

    // Memoized filtered accounts
    const filteredAccounts = useMemo(() => {
        let filtered = accounts;

        // Filter by group
        if (groupName) {
            filtered = filtered.filter(account => account.og_name === `.${groupName}`)
        }

        // Filter for agents
        if (showOnlyAgents) {
            filtered = filtered.filter(account => account.is_agent)
        }

        // Filter by search
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase()
            filtered = filtered.filter(account => 
                account.full_account_name.toLowerCase().includes(searchLower)
            )
        }

        // Sort: agents first, then alphabetically
        return filtered.sort((a, b) => {
            if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1
            return a.full_account_name.localeCompare(b.full_account_name)
        })
    }, [accounts, groupName, showOnlyAgents, searchQuery])

    // Memoized paginated accounts
    const displayedAccounts = useMemo(() => {
        return filteredAccounts.slice(0, page * ITEMS_PER_PAGE)
    }, [filteredAccounts, page])

    const loadMore = useCallback(() => {
        if (displayedAccounts.length < filteredAccounts.length) {
            setPage(p => p + 1)
        }
    }, [displayedAccounts.length, filteredAccounts.length])

    // Handle scroll-based loading
    useEffect(() => {
        const handleScroll = () => {
            if (loading || displayedAccounts.length >= filteredAccounts.length) return;
            
            const scrolledToBottom = 
                window.innerHeight + window.scrollY >= 
                document.documentElement.scrollHeight - 1000;

            if (scrolledToBottom) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, loadMore, displayedAccounts.length, filteredAccounts.length]);

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(8)].map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
                        <CardContent className="p-4 flex items-center">
                            <Skeleton className="w-16 h-16 mr-4 bg-gray-800" />
                            <Skeleton className="h-4 w-3/4 bg-gray-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (filteredAccounts.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                {groupName && (
                    <div className="w-20 h-20 flex-shrink-0 mr-6">
                        <Image
                            src={`/groups/orbs/${groupName}-orb.png`}
                            alt={`${groupName} orb`}
                            width={80}
                            height={80}
                            className="rounded-full"
                        />
                    </div>
                )}
                <div>
                    <p className="text-xl font-mono text-gray-400 mb-4">
                        No {groupName ? `.${groupName}` : ''} accounts found{searchQuery ? ' matching your search' : ''}
                    </p>
                    {!searchQuery && (
                        <p className="text-gray-500 font-mono">
                            Any account can become an agent with a few clicks.{' '}
                            <a 
                                href="https://x.com/onchain_agents" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Contact us
                            </a>
                            {' '}to make it happen.
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {displayedAccounts.map((account) => (
                    <Link
                        key={account.full_account_name}
                        href={`/accounts/${account.full_account_name}`}
                        className="bg-primary dark:bg-primary-dark hover:bg-primary-dark dark:hover:bg-primary 
                                 text-primary-foreground dark:text-primary-dark-foreground font-bold py-4 px-6 
                                 rounded-lg transition duration-300 ease-in-out transform 
                                 hover:-translate-y-1 hover:scale-105 flex items-center"
                    >
                        <div className="w-20 h-20 flex-shrink-0 mr-6">
                            <AccountImage
                                tokenId={account.token_id}
                                groupName={account.og_name.replace('.', '')}
                            />
                        </div>
                        <span className="text-xl font-mono break-all">
                            {account.full_account_name}
                        </span>
                    </Link>
                ))}
            </div>
            {displayedAccounts.length < filteredAccounts.length && (
                <div className="flex justify-center">
                    <button
                        onClick={loadMore}
                        className="px-4 py-2 bg-primary-dark hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    )
} 