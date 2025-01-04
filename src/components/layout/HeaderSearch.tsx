import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { createPortal } from 'react-dom'

interface SearchResult {
  name: string
  path: string
}

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  React.useEffect(() => {
    async function performSearch() {
      if (!debouncedSearch) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
        const data = await response.json()
        setResults(data.results || [])
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearch])

  const modalContent = isOpen && (
    <>
      <div 
        className="fixed inset-0 bg-black/50"
        style={{ position: 'fixed', zIndex: 2147483647 }}
        onClick={() => setIsOpen(false)}
      />
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-xl"
        style={{ position: 'fixed', zIndex: 2147483647 }}
      >
        <div className="bg-[rgb(var(--background-rgb))] rounded-lg shadow-xl p-6 border border-white/20">
          <div className="max-w-md mx-auto">
            <AssetSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search accounts or groups..."
            />
          </div>
          
          <div className="mt-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-[rgba(var(--foreground-rgb),0.5)] text-lg">
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((result, i) => (
                <Link
                  key={i}
                  href={result.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-2 hover:bg-[rgba(var(--foreground-rgb),0.1)]",
                    "text-[rgb(var(--foreground-rgb))] rounded-lg",
                    "transition-colors duration-200",
                    "flex items-center justify-between",
                    "text-lg font-grotesk"
                  )}
                >
                  <span>{result.name}</span>
                  {result.path.startsWith('/groups/') && (
                    <span className="text-xs px-2 py-1 rounded bg-[rgba(var(--foreground-rgb),0.1)] text-[rgba(var(--foreground-rgb),0.7)]">
                      GROUP
                    </span>
                  )}
                </Link>
              ))
            ) : debouncedSearch && (
              <div className="text-center py-4 text-[rgba(var(--foreground-rgb),0.5)] text-lg">
                No results found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-[rgba(var(--foreground-rgb),0.1)] rounded-full transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
      {typeof document !== 'undefined' && createPortal(
        modalContent,
        document.getElementById('modal-root') || document.body
      )}
    </>
  )
} 