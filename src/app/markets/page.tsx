'use client'

import { PageHeader } from '@/components/layout/PageHeader'

export default function MarketsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="ensurance markets"
            description="swap, trade & exchange natural capital assets"
            showSearch={false}
          />
          <div className="flex flex-col items-center justify-start text-center">
            <p className="mb-4">Currently, you can find General Ensurance on</p>
            <a 
              href="https://zora.co/@ensurance" 
              className="text-blue-500 hover:text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Zora
            </a>
            <p className="mt-4">Stay tuned for our integrated marketplace!</p>
          </div>
        </div>
      </div>
    </div>
  )
} 