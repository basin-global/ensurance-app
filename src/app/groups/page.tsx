'use client'

import { useState } from 'react'
import GroupGrid from '@/modules/groups/GroupGrid'
import { PageHeader } from '@/components/layout/PageHeader'

export default function GroupsPage() {
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="min-h-screen flex flex-col">
            <div className="container mx-auto px-4 py-8 flex-1">
                <div className="space-y-4">
                    <PageHeader
                        title="ensurance groups"
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchPlaceholder="Search groups..."
                    />
                    <GroupGrid searchQuery={searchQuery} />
                </div>
            </div>
        </div>
    )
} 