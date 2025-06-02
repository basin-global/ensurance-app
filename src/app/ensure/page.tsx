'use client'

import { useState } from 'react'
import EnsureGrid from '@/modules/ensure/EnsureGrid'
import { TypewriterInput } from '@/components/ui/typewriter-input'
import { ensurePhrases } from '@/modules/ensure/ensurePhrases'
import { cn } from '@/lib/utils'

export default function EnsurePage() {
  const [ensureData, setEnsureData] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-8">
          <div className="px-4 md:px-6 pt-8">
            <h1 className="text-2xl md:text-4xl font-bold text-center mb-3 md:mb-4">
              what do you want to ensure?
            </h1>
            <div className="w-full flex justify-center mb-6 md:mb-8 px-2 md:px-0">
              <div className="relative w-full max-w-2xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder=""
                  className={cn(
                    "w-full px-4 py-2 rounded-lg text-center",
                    "bg-[rgb(var(--background-rgb))]",
                    "border border-[rgba(var(--foreground-rgb),0.1)]",
                    "text-[rgb(var(--foreground-rgb))]",
                    "placeholder:text-[rgba(var(--foreground-rgb),0.5)]",
                    "focus:outline-none focus:ring-2 focus:ring-[rgba(var(--foreground-rgb),0.2)]",
                    "transition-colors duration-200",
                    "text-2xl md:text-3xl"
                  )}
                />
                {!isInputFocused && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <TypewriterInput words={ensurePhrases} size="small" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <EnsureGrid 
            types={['general', 'specific', 'syndicate', 'account', 'group']}
            urlPrefix=""
            searchQuery={searchQuery}
            onDataChange={setEnsureData}
          />
        </div>
      </div>
    </div>
  )
} 