'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SearchProvider, useSearch } from './SearchContext'
import { PageHeader } from '@/components/layout/PageHeader'

type Category = 'all' | 'stocks' | 'flows'

function NavigationContent() {
    const router = useRouter()
    const pathname = usePathname()
    const { searchQuery, setSearchQuery } = useSearch()
    
    const activeCategory = pathname === '/natural-capital' 
        ? 'all'
        : pathname.endsWith('/stocks') 
            ? 'stock' 
            : 'flow'

    const isMainPage = pathname === '/natural-capital'

    const allTabs = [
        { value: 'all', display: 'ALL', href: '/natural-capital' },
        { value: 'stock', display: 'STOCKS', href: '/natural-capital/stocks' },
        { value: 'flow', display: 'FLOWS', href: '/natural-capital/flows' }
    ]

    const mainPageTabs = allTabs.filter(tab => tab.value !== 'all')
    
    const tabs = isMainPage ? mainPageTabs : allTabs

    const handleTabChange = (value: string) => {
        const tab = tabs.find(t => t.value === value)
        if (tab) {
            router.push(tab.href)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
                <PageHeader
                    title="natural capital"
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchPlaceholder="search natural capital..."
                    tabs={tabs}
                    activeTab={activeCategory}
                    onTabChange={handleTabChange}
                />
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
            <div className="min-h-screen">
                <NavigationContent />
                {children}
            </div>
        </SearchProvider>
    )
} 