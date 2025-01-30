'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import EnsurancePoolGrid from '@/modules/ensurance/components/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'

// Define the category type with the actual values we want to use for filtering
type Category = 'all' | 'stocks' | 'flows'

interface CategoryOption {
    value: Category
    display: string
}

export default function PoolsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<Category>('all')
    
    useEffect(() => {
        const category = searchParams.get('category') as Category
        if (category && (category === 'stocks' || category === 'flows')) {
            setActiveCategory(category)
        } else {
            setActiveCategory('all')
        }
    }, [searchParams])

    // Define base categories that always show
    const baseCategories: CategoryOption[] = [
        { value: 'stocks', display: 'stocks' },
        { value: 'flows', display: 'flows' }
    ]

    // Get visible categories - only show 'all' when a filter is active
    const visibleCategories: CategoryOption[] = activeCategory !== 'all'
        ? [{ value: 'all', display: 'all' }, ...baseCategories]
        : baseCategories

    const updateCategory = (value: Category) => {
        if (value === 'all') {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('category')
            router.push(params.toString() ? `?${params.toString()}` : '/pools')
        } else {
            const params = new URLSearchParams(searchParams.toString())
            params.set('category', value)
            router.push(`?${params.toString()}`)
        }
        setActiveCategory(value)
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                {/* Category Navigation */}
                <nav>
                    <div className="container mx-auto px-4 flex flex-col items-center">
                        <h2 className="text-lg mb-4 text-muted-foreground flex flex-col items-center font-bold leading-tight tracking-widest">
                            <span>NATURAL CAPITAL</span>
                        </h2>
                        <div className="border-b border-gray-800">
                            <ul className="flex gap-8">
                                {visibleCategories.map((category) => (
                                    <li key={category.value}>
                                        <button
                                            onClick={() => updateCategory(category.value)}
                                            className={cn(
                                                "inline-block py-4 font-medium transition-colors",
                                                activeCategory === category.value
                                                    ? "text-white border-b-2 border-white"
                                                    : "text-gray-400 hover:text-white"
                                            )}
                                        >
                                            {category.display}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
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