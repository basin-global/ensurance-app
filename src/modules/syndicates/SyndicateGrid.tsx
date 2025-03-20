'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Syndicate {
    id: string;
    name: string;
    description: string | null;
    strategy: string | null;
    asset_address: string;
    chain: string;
    impact_tags: string[];
    currency: string;
    media: Record<string, any>;
    image_url: string;
}

interface SyndicateGridProps {
    searchQuery?: string;
}

export default function SyndicateGrid({ searchQuery = '' }: SyndicateGridProps) {
    const [syndicates, setSyndicates] = useState<Syndicate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSyndicates() {
            try {
                const response = await fetch('/api/syndicates?chain=base')
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

    const getSyndicateUrl = (id: string) => {
        return `/syndicates/${id}`
    }

    const filteredSyndicates = syndicates.filter(syndicate => 
        syndicate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (syndicate.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (syndicate.strategy?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        syndicate.impact_tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (loading) return <div>Loading...</div>
    if (error) return <div className="text-red-500">{error}</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredSyndicates.map((syndicate) => (
                <Link
                    key={syndicate.id}
                    href={getSyndicateUrl(syndicate.id)}
                    className="bg-primary dark:bg-primary-dark hover:bg-primary-dark dark:hover:bg-primary text-primary-foreground dark:text-primary-dark-foreground rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
                >
                    <div className="relative w-full h-40">
                        <Image
                            src={syndicate.image_url}
                            alt={syndicate.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="p-4">
                        <h3 className="text-lg font-bold mb-2 truncate">
                            {syndicate.name}
                        </h3>
                        {syndicate.description && (
                            <p className="text-sm opacity-80 line-clamp-2 mb-2">
                                {syndicate.description}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {syndicate.impact_tags.map((tag, index) => (
                                <span 
                                    key={index}
                                    className="text-xs px-2 py-1 bg-primary-dark/10 dark:bg-primary/10 rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="mt-2 text-sm opacity-80">
                            {syndicate.currency}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
} 