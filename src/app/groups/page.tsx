'use client'

import { useState } from 'react'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import GroupGrid from '@/modules/groups/GroupGrid'
import { useSite } from '@/contexts/site-context'

export default function GroupsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const site = useSite()

    const headerText = site === 'onchain-agents' ? 'onchain groups' : 'ensurance groups'

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-8">{headerText}</h1>
                <div className="w-full flex justify-center mb-8">
                    <AssetSearch 
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        placeholder="Search groups..."
                    />
                </div>
                <div className="w-full">
                    <GroupGrid searchQuery={searchQuery} />
                </div>
            </div>
        </main>
    )
} 