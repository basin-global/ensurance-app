'use client'

import { useState } from 'react'
import EnsurancePoolGrid from '@/modules/ensurance/components/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'

// Define the category type with the actual values we want to use for filtering
type Category = 'all' | 'Ecosystems' | 'Core Benefits'

export default function PoolsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  
  // Define categories with their display names
  const categoryConfig: { value: Category; display: string }[] = [
    { value: 'all', display: 'all' },
    { value: 'Ecosystems', display: 'ecosystems' },
    { value: 'Core Benefits', display: 'core benefits' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">ensurance pools</h1>
      <div className="space-y-6">
        {/* Category Navigation */}
        <nav>
          <div className="container mx-auto px-4 flex justify-center">
            <ul className="flex space-x-8">
              {categoryConfig.map(({ value, display }) => (
                <li key={value}>
                  <button
                    onClick={() => setActiveCategory(value)}
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