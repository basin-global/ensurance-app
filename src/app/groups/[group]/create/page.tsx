'use client'

import { SubNavigation } from '@/components/layout/SubNavigation'
import { GroupInfo } from '@/modules/groups/GroupInfo'
import Image from 'next/image'

export default function GroupCreatePage({ params }: { params: { group: string } }) {
    return (
        <div className="min-h-screen flex flex-col">
            <SubNavigation type="accounts" groupName={params.group} />
            <div className="flex-1">
                <div className="flex items-center justify-center py-24">
                    <div className="w-20 h-20 flex-shrink-0 mr-6">
                        <Image
                            src={`/groups/orbs/${params.group}-orb.png`}
                            alt={`${params.group} orb`}
                            width={80}
                            height={80}
                            className="rounded-full"
                        />
                    </div>
                    <div>
                        <p className="text-xl font-mono text-white-400 mb-4">
                            Create your own .{params.group} account...
                        </p>
                        <p className="text-gray-500 font-mono">
                            Account creation is coming soon.{' '}
                            <a 
                                href="https://x.com/ensurance_app" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                follow updates here
                            </a>
                            .
                        </p>
                    </div>
                </div>
            </div>
            <GroupInfo groupName={params.group} />
        </div>
    )
} 