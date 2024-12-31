'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSite } from '@/contexts/site-context'
import AccountImage from './AccountImage'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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
    const [allAccounts, setAllAccounts] = useState<Account[]>([])
    const [displayedAccounts, setDisplayedAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [displayLimit, setDisplayLimit] = useState(20)
    const ITEMS_PER_PAGE = 20

    const showOnlyAgents = site === 'onchain-agents' || agentsOnly

    // Fetch all accounts once
    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/accounts')
            if (!response.ok) throw new Error('Failed to fetch accounts')
            const data = await response.json()
            setAllAccounts(data)
        } catch (err) {
            setError('Failed to load accounts')
        } finally {
            setLoading(false)
        }
    }

    // Initial fetch
    useEffect(() => {
        fetchAccounts()
    }, [])

    // Handle filtering and display
    useEffect(() => {
        let filtered = allAccounts

        // Filter by group if specified
        if (groupName) {
            filtered = filtered.filter(account => account.og_name === `.${groupName}`)
        }

        // Filter for agents
        if (showOnlyAgents) {
            filtered = filtered.filter(account => account.is_agent)
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(account => 
                account.full_account_name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Sort
        filtered.sort((a, b) => {
            if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1
            return a.full_account_name.localeCompare(b.full_account_name)
        })

        setDisplayedAccounts(filtered)
    }, [allAccounts, groupName, showOnlyAgents, searchQuery])

    const loadMore = () => {
        setDisplayLimit(prev => prev + ITEMS_PER_PAGE)
    }

    const getAccountUrl = (accountName: string) => {
        const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
        return `${basePath}/${accountName}`
    }

    if (error) return <div className="text-red-500">{error}</div>

    return (
        <InfiniteScroll
            dataLength={Math.min(displayLimit, displayedAccounts.length)}
            next={loadMore}
            hasMore={displayLimit < displayedAccounts.length}
            loader={
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {[...Array(4)].map((_, index) => (
                        <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
                            <CardContent className="p-4 flex items-center">
                                <Skeleton className="w-16 h-16 mr-4 bg-gray-800" />
                                <Skeleton className="h-4 w-3/4 bg-gray-800" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {displayedAccounts.slice(0, displayLimit).map((account) => (
                    <Link
                        key={account.full_account_name}
                        href={getAccountUrl(account.full_account_name)}
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
        </InfiniteScroll>
    )
} 