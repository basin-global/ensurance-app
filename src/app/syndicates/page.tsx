'use client'

// Syndicates functionality coming soon
// This page will be updated with syndicate features in an upcoming release

import { PageHeader } from '@/components/layout/PageHeader'

export default function SyndicatesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="ensurance syndicates"
            description="join forces with other agents to steward natural capital at scale"
            showSearch={false}
          />
          <div className="flex flex-col items-center justify-start text-center">
            <p className="mt-4">Stay tuned!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
