import { groups } from '@/lib/database/queries/groups'
import { notFound } from 'next/navigation'

export default async function GroupPage({ params }: { params: { group: string } }) {
    const groupData = await groups.getByName(`.${params.group}`)
    
    if (!groupData) {
        notFound()
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2">
                    {groupData.og_name}
                </h1>
                
                {groupData.name_front && (
                    <h2 className="text-2xl text-gray-600 dark:text-gray-300 mb-4">
                        {groupData.name_front}
                    </h2>
                )}

                {groupData.tagline && (
                    <p className="text-xl mb-6 text-gray-700 dark:text-gray-200">
                        {groupData.tagline}
                    </p>
                )}

                {groupData.description && (
                    <div className="prose dark:prose-invert max-w-none mb-8">
                        <p>{groupData.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Details</h3>
                        <dl className="space-y-2">
                            <div>
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Contract Address</dt>
                                <dd className="font-mono">{groupData.contract_address}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Total Supply</dt>
                                <dd>{groupData.total_supply}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact</h3>
                        <dl className="space-y-2">
                            {groupData.email && (
                                <div>
                                    <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                                    <dd>
                                        <a href={`mailto:${groupData.email}`} className="text-blue-500 hover:text-blue-600">
                                            {groupData.email}
                                        </a>
                                    </dd>
                                </div>
                            )}
                            {groupData.website && (
                                <div>
                                    <dt className="text-sm text-gray-500 dark:text-gray-400">Website</dt>
                                    <dd>
                                        <a href={groupData.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                                            {groupData.website}
                                        </a>
                                    </dd>
                                </div>
                            )}
                            {groupData.chat && (
                                <div>
                                    <dt className="text-sm text-gray-500 dark:text-gray-400">Chat</dt>
                                    <dd>
                                        <a href={groupData.chat} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                                            Join Chat
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    )
} 