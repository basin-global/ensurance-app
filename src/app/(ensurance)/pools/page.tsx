'use client'

import { useState } from 'react'
import EnsurancePoolGrid from '@/modules/ensurance/components/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'

type Category = 'all' | 'ecosystems' | 'core benefits'

export default function PoolsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const categories: Category[] = ['all', 'ecosystems', 'core benefits']

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Ensurance Pools</h1>
      <div className="space-y-6">
        {/* Category Navigation */}
        <nav>
          <div className="container mx-auto px-4 flex justify-center">
            <ul className="flex space-x-8">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "inline-block py-4 font-medium transition-colors",
                      activeCategory === category
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    {category}
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