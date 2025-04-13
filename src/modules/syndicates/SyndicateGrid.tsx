'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Syndicate {
    name: string;
    tagline: string;
    description: string | null;
    currency: string;
    media: Record<string, any>;
    image_url: string;
    natural_capital_stocks: string[];
    natural_capital_flows: string[];
    nat_cap_rate: string | number;
}

interface SyndicateGridProps {
    searchQuery?: string;
}

const FALLBACK_IMAGE = '/assets/ensurance-example.png'
const ITEMS_PER_PAGE = 12

export default function SyndicateGrid({ searchQuery = '' }: SyndicateGridProps) {
    const [syndicates, setSyndicates] = useState<Syndicate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)

    // Reset page when search changes
    useEffect(() => {
        setPage(1)
    }, [searchQuery])

    const fetchSyndicates = useCallback(async () => {
        try {
            const response = await fetch('/api/syndicates')
            if (!response.ok) throw new Error('Failed to fetch syndicates')
            const data = await response.json()
            setSyndicates(data)
        } catch (err) {
            console.error('Error fetching syndicates:', err)
            setError('Failed to load syndicates')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let mounted = true
        setLoading(true)

        const load = async () => {
            try {
                await fetchSyndicates()
            } catch (err) {
                if (mounted) {
                    setError('Failed to load syndicates')
                }
            }
        }

        load()
        return () => { mounted = false }
    }, [fetchSyndicates])

    const getSyndicateUrl = (name: string) => {
        return `/syndicates/${name.toLowerCase().replace(/\s+/g, '-')}`
    }

    const formatCurrency = (currency: string) => {
        if (currency.startsWith('0x')) {
            return `${currency.slice(0, 6)}...${currency.slice(-4)}`
        }
        return currency
    }

    // Memoized filtered syndicates
    const filteredSyndicates = useMemo(() => {
        if (!searchQuery) return syndicates

        const searchLower = searchQuery.toLowerCase()
        return syndicates.filter(syndicate => {
            const nameMatch = syndicate.name.toLowerCase().includes(searchLower)
            const taglineMatch = syndicate.tagline.toLowerCase().includes(searchLower)
            const descriptionMatch = syndicate.description?.toLowerCase().includes(searchLower) || false
            const stocksMatch = syndicate.natural_capital_stocks.some(stock => 
                stock.toLowerCase().includes(searchLower)
            )
            const flowsMatch = syndicate.natural_capital_flows.some(flow => 
                flow.toLowerCase().includes(searchLower)
            )

            return nameMatch || taglineMatch || descriptionMatch || stocksMatch || flowsMatch
        })
    }, [syndicates, searchQuery])

    // Memoized paginated syndicates
    const displayedSyndicates = useMemo(() => {
        return filteredSyndicates.slice(0, page * ITEMS_PER_PAGE)
    }, [filteredSyndicates, page])

    const loadMore = useCallback(() => {
        if (displayedSyndicates.length < filteredSyndicates.length) {
            setPage(p => p + 1)
        }
    }, [displayedSyndicates.length, filteredSyndicates.length])

    // Handle scroll-based loading
    useEffect(() => {
        const handleScroll = () => {
            if (loading || displayedSyndicates.length >= filteredSyndicates.length) return;
            
            const scrolledToBottom = 
                window.innerHeight + window.scrollY >= 
                document.documentElement.scrollHeight - 1000;

            if (scrolledToBottom) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, loadMore, displayedSyndicates.length, filteredSyndicates.length]);

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
                        <CardContent className="p-6">
                            <Skeleton className="w-full mb-4 bg-gray-800" style={{ aspectRatio: '16/9' }} />
                            <Skeleton className="h-6 w-3/4 mx-auto mb-2 bg-gray-800" />
                            <Skeleton className="h-4 w-full mb-4 bg-gray-800" />
                            <div className="flex justify-between mb-4">
                                <Skeleton className="h-4 w-1/3 bg-gray-800" />
                                <Skeleton className="h-4 w-1/3 bg-gray-800" />
                            </div>
                            <Skeleton className="h-10 w-32 mx-auto bg-gray-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (filteredSyndicates.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    No syndicates found{searchQuery ? ' matching your search' : ''}.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedSyndicates.map((syndicate) => (
                    <Card 
                        key={syndicate.name} 
                        className="group relative bg-black/20 backdrop-blur-sm border-0 overflow-hidden rounded-xl transition-all duration-300 hover:bg-black/30"
                    >
                        <Link href={getSyndicateUrl(syndicate.name)}>
                            <CardContent className="p-0">
                                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                                    <Image
                                        src={syndicate.media?.banner || syndicate.image_url || FALLBACK_IMAGE}
                                        alt={syndicate.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        priority={false}
                                        loading="lazy"
                                        className="object-cover transition-all duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.src = FALLBACK_IMAGE;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                </div>
                                
                                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs text-white/90 font-medium tracking-wide">
                                            yield: {syndicate.nat_cap_rate}%
                                        </span>
                                        <a 
                                            href={`mailto:tmo@basin.global?subject=Join Waitlist: ${syndicate.name}&body=Hi, I'm interested in joining the waitlist for the ${syndicate.name} syndicate.%0D%0A%0D%0ASyndicate: ${syndicate.name}`}
                                            className="px-3.5 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-xs text-white font-medium tracking-wide transition-all duration-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Join Waitlist
                                        </a>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-2.5">
                                            <h3 className="text-xl font-semibold text-white tracking-tight">
                                                {syndicate.name}
                                            </h3>
                                            
                                            <p className="text-[15px] leading-relaxed text-white/85 line-clamp-2 font-normal">
                                                {syndicate.tagline}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {syndicate.natural_capital_stocks.slice(0, 2).map((stock, index) => (
                                                    <span 
                                                        key={index}
                                                        className="px-3 py-1 text-xs bg-white/15 backdrop-blur-md rounded-full text-white/90 font-medium tracking-wide"
                                                    >
                                                        {stock}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Link>
                    </Card>
                ))}
            </div>
        </div>
    )
}