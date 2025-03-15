'use client'

import EnsurancePoolGrid from '@/modules/natural-capital/EnsurancePoolGrid'
import { useSearch } from '../SearchContext'

export default function StocksPools() {
    const { searchQuery } = useSearch()
    return (
        <EnsurancePoolGrid 
            groupName="ensurance" 
            activeCategory="stocks"
            searchQuery={searchQuery}
        />
    )
} 