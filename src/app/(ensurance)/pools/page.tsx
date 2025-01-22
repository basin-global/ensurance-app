'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import EnsurancePoolGrid from '@/modules/ensurance/components/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'

// Define the category type with the actual values we want to use for filtering
type Category = 'all' | 'stocks' | 'flows'

export default function PoolsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('stocks')
  
  // Effect to sync with URL params
  useEffect(() => {
    const category = searchParams.get('category') as Category
    if (category && (category === 'stocks' || category === 'flows')) {
      setActiveCategory(category)
    } else {
      setActiveCategory('all')
    }
  }, [searchParams])

  // Define base categories that always show
  const baseCategories: { value: Category; display: string }[] = [
    { value: 'stocks', display: 'stocks' },
    { value: 'flows', display: 'flows' }
  ]

  // Get visible categories - only show 'all' when a filter is active
  const visibleCategories = activeCategory !== 'all'
    ? [{ value: 'all', display: 'all' }, ...baseCategories]
    : baseCategories

  // Update URL when category changes
  const updateCategory = (category: Category) => {
    if (category === 'all') {
      // Remove category param from URL
      const params = new URLSearchParams(searchParams.toString())
      params.delete('category')
      router.push(params.toString() ? `?${params.toString()}` : '/pools')
    } else {
      // Add category param to URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('category', category)
      router.push(`?${params.toString()}`)
    }
    setActiveCategory(category)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Category Navigation */}
        <nav>
          <div className="container mx-auto px-4 flex flex-col items-center">
            <h2 className="text-lg mb-4 text-muted-foreground">natural capital</h2>
            <ul className="flex space-x-8">
              {visibleCategories.map(({ value, display }) => (
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
        />
      </div>
    </div>
  )
} 