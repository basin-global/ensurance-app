import useSWR from 'swr'
import { searchConfig } from '@/lib/swr-config'
import { useDebounce } from '@/hooks/useDebounce'

export interface SearchResult {
  name: string
  path: string
  type: 'nav' | 'group' | 'account' | 'general' | 'specific' | 'syndicate' | 'doc'
  description?: string
  is_agent?: boolean
  is_ensurance?: boolean
  token_id?: number
  tba_address?: string
}

export function useSearch(query: string, debounceMs: number = 300) {
  const debouncedQuery = useDebounce(query, debounceMs)
  
  const { data, error, mutate, isLoading, isValidating } = useSWR<SearchResult[]>(
    debouncedQuery.trim() ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : '/api/search',
    searchConfig
  )

  return {
    results: data || [],
    isLoading: isLoading || (query !== debouncedQuery), // Loading if debouncing
    isValidating,
    error,
    refetch: mutate,
    hasQuery: Boolean(debouncedQuery.trim()),
  }
}