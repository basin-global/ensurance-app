'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import EnsurancePoolGrid from '@/modules/natural-capital/EnsurancePoolGrid'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'
import { useSearch } from './SearchContext'

// Define the category type with the actual values we want to use for filtering
type Category = 'all' | 'stocks' | 'flows'

interface CategoryOption {
    value: Category
    display: string
}

interface Props {
    searchQuery?: string
}

export default function AllPools() {
    const { searchQuery } = useSearch()
    return (
        <EnsurancePoolGrid 
            groupName="ensurance" 
            activeCategory="all"
            searchQuery={searchQuery}
        />
    )
} 