'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import AccountImage from './AccountImage'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'

interface Account {
    full_account_name: string;
    token_id: number;
    group_name: string;
    is_agent: boolean;
}

interface AccountsGridProps {
    groupName?: string;
    searchQuery?: string;
    walletAddress?: string;
    isAgent?: boolean;
}

export default function AccountsGrid({ 
    groupName, 
    searchQuery = '', 
    walletAddress,
    isAgent
}: AccountsGridProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 20

    const getPathPrefix = () => {
        return '';
    };

    // Memoized fetch function
    const fetchAccounts = useCallback(async () => {
        try {
            console.log('AccountsGrid fetching with:', { walletAddress, groupName })

            // For "mine" view: fetch wallet's NFTs filtered by contract(s)
            if (walletAddress) {
                let contractAddresses: string[];
                let groups;
                
                // First get all groups data
                const groupsResponse = await fetch('/api/groups')
                if (!groupsResponse.ok) throw new Error('Failed to fetch groups')
                groups = await groupsResponse.json()
                console.log('Found groups:', groups)

                // If groupName provided, filter to single group
                if (groupName) {
                    const group = groups.find((g: any) => 
                        g.group_name === (groupName.startsWith('.') ? groupName : `.${groupName}`)
                    )
                    if (!group) throw new Error('Group not found')
                    contractAddresses = [group.contract_address.toLowerCase()]
                }
                // For root /mine, use all group contracts
                else {
                    contractAddresses = groups
                        .filter((group: any) => group.contract_address) // Ensure we have a contract
                        .map((group: any) => group.contract_address.toLowerCase())
                }

                console.log('Using contract addresses:', contractAddresses)

                // Format contract IDs with chain prefix
                const contractIds = contractAddresses.map(addr => `base.${addr}`)
                console.log('Formatted contract IDs:', contractIds)

                // Build SimpleHash API URL with comma-separated contract_ids
                const apiUrl = `/api/simplehash/nft?address=${walletAddress}&contract_ids=${contractIds.join(',')}`
                console.log('Full SimpleHash API URL:', apiUrl)
                console.log('Contract IDs parameter:', contractIds.join(','))

                // Fetch wallet's NFTs filtered by contract(s)
                const nftResponse = await fetch(apiUrl)
                if (!nftResponse.ok) throw new Error('Failed to fetch NFTs')
                const nftData = await nftResponse.json()
                console.log('Raw SimpleHash response:', nftData)

                // Transform NFTs to match Account interface
                const transformedNfts = nftData.nfts.map((nft: any) => {
                    // Find matching group for group_name
                    const contractAddress = nft.contract_address.toLowerCase()
                    const matchingGroup = groups.find((group: any) => 
                        group.contract_address.toLowerCase() === contractAddress
                    )
                    const groupName = matchingGroup?.group_name || nft.collection?.name || ''

                    return {
                        full_account_name: nft.name,
                        token_id: parseInt(nft.token_id),
                        group_name: groupName,
                        is_agent: false // TODO: Determine if this is an agent based on metadata
                    }
                })

                console.log('Transformed NFTs:', transformedNfts)
                return transformedNfts
            } 
            // For regular view: use existing DB accounts endpoint
            else {
                const endpoint = groupName 
                    ? `/api/accounts?group=${encodeURIComponent(groupName)}`
                    : '/api/accounts'
                console.log('Fetching DB accounts from:', endpoint)
                
                const response = await fetch(endpoint)
                if (!response.ok) throw new Error('Failed to fetch accounts')
                const data = await response.json()
                console.log('DB accounts:', data)
                return data
            }
        } catch (err) {
            console.error('Error fetching accounts:', err)
            throw err
        }
    }, [walletAddress, groupName])

    // Initial fetch with cleanup
    useEffect(() => {
        let mounted = true;
        setLoading(true)
        
        const load = async () => {
            try {
                const data = await fetchAccounts()
                if (mounted) {
                    setAccounts(data)
                }
            } catch (err) {
                console.error('Error loading accounts:', err)
                if (mounted) {
                    setError('Failed to load accounts')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        load()
        
        return () => {
            mounted = false
        }
    }, [fetchAccounts])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [groupName, searchQuery])

    // Memoized filtered accounts
    const filteredAccounts = useMemo(() => {
        let filtered = accounts;

        // Filter by search
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase()
            filtered = filtered.filter(account => 
                account?.full_account_name?.toLowerCase()?.includes(searchLower) ?? false
            )
        }

        // Filter by isAgent if specified
        if (isAgent !== undefined) {
            filtered = filtered.filter(account => account.is_agent === isAgent)
        }

        // Sort: agents first, then alphabetically
        return filtered.sort((a, b) => {
            // First sort by is_agent (agents come first)
            if (a.is_agent !== b.is_agent) {
                return a.is_agent ? -1 : 1;
            }
            
            // Then sort alphabetically
            if (!a.full_account_name && !b.full_account_name) return 0;
            if (!a.full_account_name) return 1;  // null values go to end
            if (!b.full_account_name) return -1;
            return a.full_account_name.localeCompare(b.full_account_name);
        });
    }, [accounts, searchQuery, isAgent])

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
            <div className="text-center py-8">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    {walletAddress ? (
                        "API migration in progress - NFT functionality will be restored soon"
                    ) : (
                        <>
                            No{groupName ? ` .${groupName}` : ''} accounts found{searchQuery ? ' matching your search' : ''}.
                            {!searchQuery && (
                                <>
                                    {' '}You can create one{' '}
                                    <Link 
                                        href={`${getPathPrefix()}/create`}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        here
                                    </Link>.
                                </>
                            )}
                        </>
                    )}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {displayedAccounts.map((account) => (
                    <Link
                        key={account.full_account_name}
                        href={`${getPathPrefix()}/${account.full_account_name}`}
                        className="bg-primary dark:bg-primary-dark hover:bg-primary-dark dark:hover:bg-primary 
                                 text-primary-foreground dark:text-primary-dark-foreground font-bold py-4 px-6 
                                 rounded-lg transition duration-300 ease-in-out transform 
                                 hover:-translate-y-1 hover:scale-105 flex items-center"
                    >
                        <div className="w-20 h-20 flex-shrink-0 mr-6">
                            <AccountImage
                                tokenId={account.token_id}
                                groupName={groupName || account.group_name?.replace('.', '')}
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