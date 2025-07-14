'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'

interface Group {
    group_name: string;
    name_front: string | null;
}

export default function CreateAccountPage() {
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="create agent account"
            showSearch={false}
          />
          
          {!loading && groups.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-mono text-white-400 mb-6 text-center">
                choose a group to join
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {groups.map((group) => (
                  <Link
                    key={group.group_name}
                    href={`/groups/${group.group_name.replace(/^\./, '')}/create`}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors group"
                  >
                    <div className="w-16 h-16 mb-3">
                      <Image
                        src={`/groups/orbs/${group.group_name.replace(/^\./, '')}-orb.png`}
                        alt={`${group.group_name} orb`}
                        width={64}
                        height={64}
                        className="rounded-full group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-lg font-mono text-gray-500 group-hover:text-gray-300 transition-colors text-center">
                      {group.group_name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 