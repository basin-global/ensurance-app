'use client'

import { Ensure } from '@/modules/ensure'

export default function SyndicatesPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-[30px] py-16">
      <div className="mb-16 space-y-4">
        <h1 className="text-4xl font-light">Ensurance Syndicates</h1>
      </div>
      
      <Ensure 
        variant="syndicates"
        showSearch={false}
        showViewToggle={false}
      />
    </div>
  )
}
