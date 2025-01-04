'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSite } from '@/contexts/site-context'

interface Group {
    og_name: string;
    name_front: string | null;
    tagline: string | null;
    total_supply: number;
    contract_address: string;
}

interface GroupGridProps {
    searchQuery: string;
}

export default function GroupGrid({ searchQuery }: GroupGridProps) {
    const site = useSite()
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchGroups() {
            try {
                const response = await fetch('/api/groups')
                if (!response.ok) throw new Error('Failed to fetch groups')
                const data = await response.json()
                setGroups(data)
            } catch (err) {
                setError('Failed to load groups')
            } finally {
                setLoading(false)
            }
        }

        fetchGroups()
    }, [])

    const getGroupUrl = (groupName: string) => {
        const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
        return `${basePath}/groups/${groupName.replace(/^\./, '')}/all`
    }

    const filteredGroups = groups.filter(group => 
        group.og_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.name_front?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (group.tagline?.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (loading) return <div>Loading...</div>
    if (error) return <div className="text-red-500">{error}</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredGroups.map((group) => (
                <Link
                    key={group.contract_address}
                    href={getGroupUrl(group.og_name)}
                    className="bg-primary dark:bg-primary-dark hover:bg-primary-dark dark:hover:bg-primary text-primary-foreground dark:text-primary-dark-foreground font-bold py-4 px-6 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 flex items-center"
                >
                    <div className="w-16 h-16 flex-shrink-0 mr-4">
                        <Image
                            src={`/groups/orbs/${group.og_name.replace(/^\./, '')}-orb.png`}
                            alt={`${group.og_name} orb`}
                            width={64}
                            height={64}
                            className="object-cover rounded-full"
                        />
                    </div>
                    <span className="text-lg font-mono truncate">
                        {group.og_name}
                    </span>
                </Link>
            ))}
        </div>
    )
} 