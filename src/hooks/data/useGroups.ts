import useSWR from 'swr'
import { userDataConfig } from '@/lib/swr-config'

export interface Group {
  group_name: string
  name_front: string | null
  tagline: string | null
  description?: string
  total_supply: number
  contract_address: string
  is_active: boolean
  member_count?: number
  created_at?: string
}

export function useGroups() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<Group[]>(
    '/api/groups',
    userDataConfig
  )

  return {
    groups: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useGroup(groupName?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<Group>(
    groupName ? `/api/groups?name=${encodeURIComponent(groupName)}` : null,
    userDataConfig
  )

  return {
    group: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}