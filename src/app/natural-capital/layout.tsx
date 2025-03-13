'use client'

import { usePathname, useRouter } from 'next/navigation'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { SearchProvider, useSearch } from './SearchContext'
import { cn } from '@/lib/utils'

type Category = 'all' | 'stocks' | 'flows'

function NavigationContent() {
    const router = useRouter()
    const pathname = usePathname()
    const { searchQuery, setSearchQuery } = useSearch()
    
    const activeCategory = pathname === '/natural-capital' 
        ? 'all'
        : pathname.endsWith('/stocks') 
            ? 'stocks' 
            : 'flows'

    const categories = [
        { value: 'stocks' as Category, display: 'Stocks' },
        { value: 'flows' as Category, display: 'Flows' }
    ]

    const handleCategoryChange = (value: Category) => {
        if (value === 'all') {
            router.push('/natural-capital')
        } else {
            router.push(`/natural-capital/${value}`)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                <nav>
                    <div className="container mx-auto px-4 flex flex-col items-center">
                        <h2 className="text-lg mb-4 text-muted-foreground flex flex-col items-center font-bold leading-tight tracking-widest">
                            <span>NATURAL CAPITAL</span>
                        </h2>
                        <div className="border-b border-gray-800">
                            <ul className="flex gap-8">
                                {activeCategory !== 'all' && (
                                    <li>
                                        <button
                                            onClick={() => handleCategoryChange('all')}
                                            className="inline-block py-4 font-medium transition-colors text-gray-400 hover:text-white"
                                        >
                                            All
                                        </button>
                                    </li>
                                )}
                                {categories.map((cat) => (
                                    <li key={cat.value}>
                                        <button
                                            onClick={() => handleCategoryChange(cat.value)}
                                            className={cn(
                                                "inline-block py-4 font-medium transition-colors",
                                                activeCategory === cat.value
                                                    ? "text-white border-b-2 border-white"
                                                    : "text-gray-400 hover:text-white"
                                            )}
                                        >
                                            {cat.display}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </nav>

                <div className="flex justify-center">
                    <AssetSearch 
                        searchQuery={searchQuery} 
                        setSearchQuery={setSearchQuery}
                        placeholder="search natural capital..." 
                    />
                </div>
            </div>
        </div>
    )
}

export default function NaturalCapitalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SearchProvider>
            <NavigationContent />
            {children}
        </SearchProvider>
    )
} 