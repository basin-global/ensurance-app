'use client'

import EnsurancePoolGrid from '@/modules/pools/EnsurancePoolGrid'
import { useSearch } from '../SearchContext'

export default function FlowsPools() {
    const { searchQuery } = useSearch()
    return (
        <EnsurancePoolGrid 
            groupName="ensurance" 
            activeCategory="flows"
            searchQuery={searchQuery}
        />
    )
} 