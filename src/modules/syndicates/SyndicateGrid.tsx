'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Syndicate {
    name: string;
    tagline: string;
    description: string | null;
    asset_address: string;
    chain: string;
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

export default function SyndicateGrid({ searchQuery = '' }: SyndicateGridProps) {
    const [syndicates, setSyndicates] = useState<Syndicate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSyndicates() {
            try {
                const response = await fetch('/api/syndicates')
                if (!response.ok) throw new Error('Failed to fetch syndicates')
                const data = await response.json()
                setSyndicates(data)
            } catch (err) {
                setError('Failed to load syndicates')
            } finally {
                setLoading(false)
            }
        }

        fetchSyndicates()
    }, [])

    const getSyndicateUrl = (name: string) => {
        return `/syndicates/${name.toLowerCase().replace(/\s+/g, '-')}`
    }

    const formatAssetAddress = (address: string) => {
        if (address.startsWith('0x')) {
            return `${address.slice(0, 6)}...${address.slice(-4)}`
        }
        return address
    }

    const filteredSyndicates = syndicates.filter(syndicate => 
        syndicate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        syndicate.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (syndicate.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        syndicate.natural_capital_stocks.some(stock => stock.toLowerCase().includes(searchQuery.toLowerCase())) ||
        syndicate.natural_capital_flows.some(flow => flow.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
                {[...Array(4)].map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
                        <CardContent className="p-4">
                            <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
                            <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) return <div className="text-red-500">{error}</div>

    return filteredSyndicates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredSyndicates.map((syndicate) => (
                <Card 
                    key={syndicate.name} 
                    className="bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors"
                >
                    <Link href={getSyndicateUrl(syndicate.name)}>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                                    <Image
                                        src={syndicate.media?.banner || syndicate.image_url || FALLBACK_IMAGE}
                                        alt={syndicate.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        priority={false}
                                        loading="lazy"
                                        className="object-cover"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.src = FALLBACK_IMAGE;
                                        }}
                                    />
                                </div>
                                <div className="text-lg font-semibold text-white text-center capitalize">
                                    {syndicate.name}
                                </div>
                                <div className="text-sm text-gray-400 text-center line-clamp-2">
                                    {syndicate.tagline}
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-400 px-2">
                                    <div className="text-emerald-500">
                                        {formatAssetAddress(syndicate.asset_address)}
                                    </div>
                                    <div className="font-medium text-emerald-400">
                                        {syndicate.nat_cap_rate}% NCR
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Link>
                    <div className="px-4 pb-4">
                        <a 
                            href={`mailto:tmo@basin.global?subject=Join Waitlist: ${syndicate.name}&body=Hi, I'm interested in joining the waitlist for the ${syndicate.name} syndicate.%0D%0A%0D%0ASyndicate: ${syndicate.name}`}
                            className="block w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded text-center text-sm transition-all duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Join Waitlist
                        </a>
                    </div>
                </Card>
            ))}
        </div>
    ) : (
        <div className="text-center py-8">
            <p className="text-lg text-gray-600 dark:text-gray-400">
                No syndicates found{searchQuery ? ' matching your search' : ''}.
            </p>
        </div>
    )
} 