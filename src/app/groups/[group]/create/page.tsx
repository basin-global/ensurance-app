'use client'

import { useState, useEffect } from 'react'
import { GroupInfo } from '@/modules/groups/GroupInfo'
import { GroupCreateAccount } from '@/modules/groups/GroupCreateAccount'
import { PageHeader } from '@/components/layout/PageHeader'
import { Loader2 } from 'lucide-react'

interface GroupData {
    group_name: string
    contract_address: string
}

export default function GroupCreatePage({ params }: { params: { group: string } }) {
    const [groupData, setGroupData] = useState<GroupData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchGroupData = async () => {
            try {
                const response = await fetch(`/api/groups`)
                if (!response.ok) throw new Error('Failed to fetch groups')
                const allGroups = await response.json()
                
                const group = allGroups.find((g: any) => 
                    g.group_name === `.${params.group}` || g.group_name === params.group
                )
                
                if (!group) {
                    setError('Group not found')
                    return
                }

                setGroupData({
                    group_name: group.group_name,
                    contract_address: group.contract_address
                })
            } catch (err) {
                console.error('Error fetching group data:', err)
                setError('Failed to load group information')
            } finally {
                setIsLoading(false)
            }
        }

        fetchGroupData()
    }, [params.group])

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col">
                <div className="container mx-auto px-4 py-8 flex-1">
                    <PageHeader
                        title={`create .${params.group} account`}
                        showSearch={false}
                    />
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mr-3" />
                        <span className="text-gray-500 font-mono">Loading group information...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !groupData) {
        return (
            <div className="min-h-screen flex flex-col">
                <div className="container mx-auto px-4 py-8 flex-1">
                    <PageHeader
                        title={`create .${params.group} account`}
                        showSearch={false}
                    />
                    <div className="text-center py-12">
                        <p className="text-red-400 font-mono">{error || 'Group not found'}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="container mx-auto px-4 py-8 flex-1">
                <PageHeader
                    title={`create .${params.group} account`}
                    showSearch={false}
                />
                <GroupCreateAccount 
                    groupName={params.group}
                    contractAddress={groupData.contract_address}
                />
            </div>
            <GroupInfo groupName={params.group} />
        </div>
    )
} 