'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface GroupData {
    og_name: string;
    name_front: string | null;
    tagline: string | null;
    description: string | null;
    email: string | null;
    website: string | null;
    chat: string | null;
}

export function GroupInfo({ groupName }: { groupName: string }) {
    const [groupData, setGroupData] = useState<GroupData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const cleanGroupName = groupName.startsWith('.') ? groupName.slice(1) : groupName
    const router = useRouter()

    useEffect(() => {
        async function fetchGroupData() {
            try {
                console.log('Fetching group data for:', groupName)
                const ogName = groupName.startsWith('.') ? groupName : `.${groupName}`
                const response = await fetch(`/api/groups?og_name=${encodeURIComponent(ogName)}`)
                if (!response.ok) throw new Error('Failed to fetch group')
                const data = await response.json()
                console.log('Received group data:', data)
                setGroupData(data)
            } catch (err) {
                console.error('Error fetching group:', err)
                setError(err instanceof Error ? err.message : 'Failed to load group data')
            }
        }

        fetchGroupData()
    }, [groupName])

    const handleGroupClick = (e: React.MouseEvent) => {
        // Only navigate if not clicking a link
        if (!(e.target as HTMLElement).closest('a')) {
            router.push(`/groups/${cleanGroupName}`)
        }
    }

    // Show loading state
    if (!groupData && !error) {
        return (
            <div className="border border-gray-800 rounded-xl overflow-hidden w-3/4 mx-auto mb-16">
                <div className="h-24 bg-gray-800 animate-pulse" />
                <div className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-800 rounded-full animate-pulse" />
                        <div className="flex-1">
                            <div className="h-5 w-48 bg-gray-800 rounded animate-pulse mb-2" />
                            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Show error state
    if (error) {
        return (
            <div className="border border-gray-800 rounded-xl p-4 w-3/4 mx-auto mb-16">
                <p className="text-red-400 text-center">Error loading group information</p>
            </div>
        )
    }

    if (!groupData) return null

    return (
        <div 
            onClick={handleGroupClick}
            className="block border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors w-3/4 mx-auto mb-16 cursor-pointer"
        >
            <div className="relative h-24">
                <Image
                    src={`/groups/banners/${cleanGroupName}-banner.jpg`}
                    alt={`${groupData.og_name} Banner`}
                    fill
                    className="object-cover brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </div>
            <div className="p-4 relative">
                <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                            src={`/groups/orbs/${cleanGroupName}-orb.png`}
                            alt={`${groupData.og_name} orb`}
                            fill
                            className="rounded-full"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <h2 className="text-lg font-bold">{groupData.og_name}</h2>
                            <span className="text-sm text-gray-400 flex items-center gap-0.5 ml-2">
                                Details
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                        {groupData.tagline && (
                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">{groupData.tagline}</p>
                        )}
                        <div className="flex gap-4">
                            {groupData.website && (
                                <a 
                                    href={groupData.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Website
                                </a>
                            )}
                            {groupData.chat && (
                                <a 
                                    href={groupData.chat}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Chat
                                </a>
                            )}
                            {groupData.email && (
                                <a 
                                    href={`mailto:${groupData.email}`}
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Email
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 