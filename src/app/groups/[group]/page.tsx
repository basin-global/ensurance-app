import { groups } from '@/lib/database/groups'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function GroupPage({ params }: { params: { group: string } }) {
    const groupData = await groups.getByName(`.${params.group}`)
    if (!groupData) {
        notFound()
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1">
                {/* Hero Section with Banner */}
                <div className="relative h-[40vh] min-h-[400px]">
                    <Image
                        src={`/groups/banners/${params.group}-banner.jpg`}
                        alt={`${groupData.group_name} Banner`}
                        fill
                        className="object-cover brightness-75"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    
                    {/* Orb and Title Content */}
                    <div className="container mx-auto px-4 h-full relative z-10">
                        <div className="flex items-end h-full pb-12 max-w-4xl mx-auto">
                            <div className="flex items-center gap-8">
                                <div className="relative w-40 h-40">
                                    <Image
                                        src={`/groups/orbs/${params.group}-orb.png`}
                                        alt={`${groupData.group_name} Orb`}
                                        fill
                                        className="rounded-full"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-5xl font-bold mb-4 text-white">
                                        {groupData.group_name}
                                    </h1>
                                    
                                    {groupData.name_front && (
                                        <h2 className="text-2xl text-gray-100 mb-4">
                                            {groupData.name_front}
                                        </h2>
                                    )}

                                    {groupData.tagline && (
                                        <p className="text-xl text-gray-200">
                                            {groupData.tagline}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-4xl mx-auto">
                        {groupData.description && (
                            <div className="prose dark:prose-invert max-w-none mb-12">
                                <p className="text-lg leading-relaxed">{groupData.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-900/50 rounded-xl p-8">
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold">Details</h3>
                                <dl className="space-y-4">
                                    {groupData.situs_account && (
                                        <div>
                                            <dt className="text-sm text-gray-400">Situs Account</dt>
                                            <dd className="mt-1">
                                                <Link 
                                                    href={`/${groupData.situs_account}`}
                                                    className="font-mono text-blue-400 hover:text-blue-300"
                                                >
                                                    {groupData.situs_account}
                                                </Link>
                                            </dd>
                                            {groupData.tba_address && (
                                                <dd className="mt-1 font-mono text-sm text-gray-500 break-all">
                                                    {groupData.tba_address}
                                                </dd>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-sm text-gray-400">Contract Address</dt>
                                        <dd className="font-mono mt-1">{groupData.contract_address}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-400">Total Supply</dt>
                                        <dd className="mt-1">{groupData.total_supply}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold">Contact</h3>
                                <dl className="space-y-4">
                                    {groupData.email && (
                                        <div>
                                            <dt className="text-sm text-gray-400">Email</dt>
                                            <dd className="mt-1">
                                                <a href={`mailto:${groupData.email}`} className="text-blue-400 hover:text-blue-300">
                                                    {groupData.email}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                    {groupData.website && (
                                        <div>
                                            <dt className="text-sm text-gray-400">Website</dt>
                                            <dd className="mt-1">
                                                <a href={groupData.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                                    {groupData.website}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                    {groupData.chat && (
                                        <div>
                                            <dt className="text-sm text-gray-400">Chat</dt>
                                            <dd className="mt-1">
                                                <a href={groupData.chat} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
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
            </div>
        </div>
    )
} 