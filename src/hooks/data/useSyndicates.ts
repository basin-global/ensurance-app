import useSWR from 'swr'
import { userDataConfig } from '@/lib/swr-config'

export interface Syndicate {
  name: string
  description?: string
  media?: {
    banner?: string
    image?: string
  }
  image_url?: string
  total_value?: string
  participant_count?: number
  created_at?: string
}

export function useSyndicates() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<Syndicate[]>(
    '/api/syndicates',
    userDataConfig
  )

  return {
    syndicates: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useSyndicate(name?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<Syndicate>(
    name ? `/api/syndicates?name=${encodeURIComponent(name)}` : null,
    userDataConfig
  )

  return {
    syndicate: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}