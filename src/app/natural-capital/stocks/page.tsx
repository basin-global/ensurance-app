'use client'

import { Suspense } from 'react'
import NaturalCapitalGrid from '@/modules/natural-capital/NaturalCapitalGrid'
import { useSearch } from '../SearchContext'

function StocksContent() {
    const { searchQuery } = useSearch()
    
    return (
        <div className="container mx-auto px-4">
            <Suspense fallback={<div>Loading...</div>}>
                <NaturalCapitalGrid
                    variant="standard"
                    showHeader={false}
                    activeCategory="stock"
                    urlPrefix="/natural-capital"
                    searchQuery={searchQuery}
                />
            </Suspense>
        </div>
    )
}

export default function StocksPage() {
    return <StocksContent />
} 