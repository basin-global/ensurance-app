'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Group {
    og_name: string;
    name_front: string | null;
}

export function GroupLinks() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchGroups() {
            try {
                const response = await fetch('/api/groups')
                if (!response.ok) throw new Error('Failed to fetch groups')
                const data = await response.json()
                setGroups(data)
            } catch (err) {
                console.error('Error fetching groups:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchGroups()
    }, [])

    if (loading) return null;

    return (
        <div className="max-w-2xl mx-auto">
            <h3 className="text-center mb-3">groups</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 text-center">
                {groups.map((group) => (
                    <Link
                        key={group.og_name}
                        href={`/groups/${group.og_name.replace(/^\./, '')}/all`}
                        className="text-sm text-gray-500 hover:text-gray-300 transition-colors truncate px-2"
                    >
                        {group.og_name}
                    </Link>
                ))}
            </div>
        </div>
    )
} 