import useSWR from 'swr'
import { userDataConfig } from '@/lib/swr-config'

export interface Account {
  full_account_name: string
  token_id: number
  group_name: string
  is_agent: boolean
  description?: string
  tba_address?: string
}

export interface AccountStats {
  total: number
  agents: number
  groups: Record<string, number>
}

export function useAccounts(group?: string) {
  const query = group ? `?group=${encodeURIComponent(group)}` : ''
  
  const { data, error, mutate, isLoading, isValidating } = useSWR<Account[]>(
    `/api/accounts${query}`,
    userDataConfig
  )

  return {
    accounts: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useAccountStats() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<AccountStats>(
    '/api/accounts/stats',
    userDataConfig
  )

  return {
    stats: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useAccount(accountName?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<Account>(
    accountName ? `/api/accounts/${encodeURIComponent(accountName)}` : null,
    userDataConfig
  )

  return {
    account: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}