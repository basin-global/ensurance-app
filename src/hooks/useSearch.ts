import useSWR from 'swr';
import { useDebounce } from './useDebounce';

export interface SearchResult {
  name: string;
  path: string;
  type: 'nav' | 'group' | 'account' | 'general' | 'specific' | 'syndicate' | 'docs';
  description?: string;
  is_agent?: boolean;
  is_ensurance?: boolean;
  token_id?: number;
  tba_address?: string;
}

export interface SearchData {
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  mutate: () => void;
  totalResults: number;
  resultsByType: Record<string, SearchResult[]>;
  hasResults: boolean;
}

export const useSearch = (query: string): SearchData => {
  // Debounce the search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);
  
  const { data, error, isLoading, mutate } = useSWR<SearchResult[]>(
    debouncedQuery ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 2, // 2 minutes
      keepPreviousData: true, // Keep previous results while loading new ones
    }
  );

  const results = data || [];
  
  // Computed values
  const totalResults = results.length;
  const hasResults = totalResults > 0;

  // Group results by type
  const resultsByType = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return {
    results,
    loading: isLoading,
    error: error || null,
    mutate,
    totalResults,
    resultsByType,
    hasResults,
  };
};

// Hook for search suggestions (when no query is provided)
export const useSearchSuggestions = () => {
  const { data, error, isLoading, mutate } = useSWR<SearchResult[]>(
    '/api/search',
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10, // 10 minutes - suggestions don't change often
    }
  );

  return {
    suggestions: data || [],
    loading: isLoading,
    error: error || null,
    mutate,
  };
};