'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import EnsurancePoolGrid from '@/modules/ensurance/components/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'
import { useSite } from '@/contexts/site-context'

// Define the category type with the actual values we want to use for filtering
type Category = 'all' | 'Ecosystems' | 'Core Benefits'

export default function PoolsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  const urlPrefix = site === 'onchain-agents' ? (isDev ? '/site-onchain-agents' : '') : ''
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>(
    (searchParams.get('category') as Category) || 'all'
  )
  
  // Define categories with their display names
  const categoryConfig: { value: Category; display: string }[] = [
    { value: 'all', display: 'all' },
    { value: 'Ecosystems', display: 'ecosystems' },
    { value: 'Core Benefits', display: 'core benefits' }
  ]

  // Update URL when category changes
  const updateCategory = (category: Category) => {
    const params = new URLSearchParams(Object.entries(searchParams.toString() ? Object.fromEntries(searchParams.entries()) : {}))
    if (category === 'all') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    router.push(`?${params.toString()}`)
    setActiveCategory(category)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Category Navigation */}
        <nav>
          <div className="container mx-auto px-4 flex justify-center">
            <ul className="flex space-x-8">
              {categoryConfig.map(({ value, display }) => (
                <li key={value}>
                  <button
                    onClick={() => updateCategory(value)}
                    className={cn(
                      "inline-block py-4 font-medium transition-colors",
                      activeCategory === value
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    {display}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Search */}
        <div className="flex justify-center">
          <AssetSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            placeholder="Search pools..." 
          />
        </div>

        {/* Grid */}
        <EnsurancePoolGrid 
          groupName="ensurance" 
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          urlPrefix={urlPrefix}
        />
      </div>
    </div>
  )
} 