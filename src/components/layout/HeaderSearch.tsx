'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { createPortal } from 'react-dom'

interface SearchResult {
  name: string
  path: string
  type: string
  chain?: string
  is_agent?: boolean
  is_pool?: boolean
  doc_section?: string
}

export function HeaderSearch() {
  const isDev = process.env.NODE_ENV === 'development'

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 200)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [lastKeyTime, setLastKeyTime] = useState(0)
  const [lastKey, setLastKey] = useState('')

  // Keyboard shortcuts map
  const shortcuts = {
    'c': '/certificates/all',  // g c - certificates
    's': '/syndicates',        // g s - syndicates
    'p': '/pools',             // g p - pools
    'e': '/exchange',          // g e - exchange
    'a': '/all',               // g a - agents
    'g': '/groups',            // g g - groups
    'b': 'https://binder.ensurance.app', // g b - binder
    't': 'https://www.coinbase.com/price/base-ensure', // g t - token ($ENSURE)
    'd': '/docs'               // g d - docs
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) {
        // Handle ⌘K to open search
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          setIsOpen(true)
          return
        }

        const now = Date.now()
        
        // If 'g' was pressed in the last 500ms, check for shortcuts
        if (lastKey === 'g' && (now - lastKeyTime) < 500) {
          const shortcutPath = shortcuts[event.key.toLowerCase()]
          if (shortcutPath) {
            event.preventDefault()
            if (shortcutPath.includes('coinbase.com')) {
              window.open(shortcutPath, '_blank')
            } else {
              window.location.href = shortcutPath
            }
          }
          setLastKey('')
          return
        }

        // If 'g' is pressed, start the shortcut sequence
        if (event.key === 'g') {
          setLastKeyTime(now)
          setLastKey('g')
          return
        }

        setLastKey('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, lastKey, lastKeyTime])

  // Load initial results when opened
  const loadInitialResults = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/search?q=')
      const data = await response.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Initial search failed:', error)
      setResults([])
    }
    setIsLoading(false)
  }

  // Load nav items when opened
  useEffect(() => {
    if (isOpen) {
      loadInitialResults()
    }
  }, [isOpen])

  // Clear search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : prev
          )
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            window.location.href = results[selectedIndex].path
            setIsOpen(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  React.useEffect(() => {
    async function performSearch() {
      // If search is empty, load initial nav items
      if (!debouncedSearch) {
        loadInitialResults()
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedSearch)}`,
          { 
            signal: abortControllerRef.current.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        )
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Search API error:', errorData)
          throw new Error(errorData.error || 'Search failed')
        }
        
        const data = await response.json()
        console.log('Search API response:', data)
        
        if (abortControllerRef.current) {
          setResults(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Search failed:', error)
          setResults([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [debouncedSearch])

  const sortedResults = React.useMemo(() => {
    if (!Array.isArray(results)) {
      console.warn('Results is not an array:', results)
      return []
    }
    return [...results].sort((a, b) => {
      const typeOrder = {
        group: 1,
        account: a.is_pool ? 2 : (a.is_agent ? 3 : 4),
        certificate: 5,
        doc: 6
      }
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99)
    })
  }, [results])

  const searchPlaceholder = "search all"

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
              placeholder={searchPlaceholder}
              autoFocus={isOpen}
            />
          </div>
          
          <div className="mt-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-[rgba(var(--foreground-rgb),0.5)] text-lg">
                searching...
              </div>
            ) : searchQuery && debouncedSearch && !isLoading && sortedResults.length === 0 ? (
              <div className="text-center py-4 text-[rgba(var(--foreground-rgb),0.5)] text-lg">
                No results found
              </div>
            ) : sortedResults.length > 0 ? (
              sortedResults.map((result, i) => (
                <Link
                  key={i}
                  href={result.path}
                  onClick={() => setIsOpen(false)}
                  target={result.path.includes('coinbase.com') ? '_blank' : undefined}
                  rel={result.path.includes('coinbase.com') ? 'noopener noreferrer' : undefined}
                  className={cn(
                    "block px-4 py-2 hover:bg-[rgba(var(--foreground-rgb),0.1)]",
                    "text-[rgb(var(--foreground-rgb))] rounded-lg",
                    "transition-colors duration-200",
                    "flex items-center justify-between",
                    "text-lg font-grotesk",
                    i === selectedIndex && "bg-[rgba(var(--foreground-rgb),0.1)]"
                  )}
                >
                  <span className={result.type === 'nav' ? 'font-bold' : ''}>
                    {result.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {result.type === 'nav' ? (
                      <span className="text-xs px-2 py-1 rounded bg-[rgba(var(--foreground-rgb),0.1)] text-[rgba(var(--foreground-rgb),0.7)]">
                        NAV
                      </span>
                    ) : result.type === 'group' && (
                      <span className="text-xs px-2 py-1 rounded bg-[rgba(var(--foreground-rgb),0.1)] text-[rgba(var(--foreground-rgb),0.7)]">
                        GROUP
                      </span>
                    )}
                    {result.type === 'account' && (
                      <>
                        {result.is_pool ? (
                          <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                            POOL
                          </span>
                        ) : result.is_agent ? (
                          <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                            AGENT
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                            ACCOUNT
                          </span>
                        )}
                      </>
                    )}
                    {result.type === 'certificate' && (
                      <span className="text-xs px-2 py-1 rounded bg-gradient-to-r from-amber-300/20 to-amber-600/20 text-amber-500">
                        CERTIFICATE
                      </span>
                    )}
                    {result.type === 'doc' && (
                      <div className="flex items-center gap-1">
                        {result.doc_section && (
                          <span className="text-xs px-2 py-1 rounded bg-[rgba(var(--foreground-rgb),0.1)] text-[rgba(var(--foreground-rgb),0.7)]">
                            {result.doc_section}
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-400">
                          DOC
                        </span>
                      </div>
                    )}
                  </div>
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