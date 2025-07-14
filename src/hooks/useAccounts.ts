import useSWR from 'swr';
import { usePrivy } from '@privy-io/react-auth';

export interface Account {
  full_account_name: string;
  token_id: number;
  group_name: string;
  is_agent: boolean;
  description?: string;
  tba_address?: string;
  total_currency_value?: number;
  total_assets?: number;
  ensured_assets?: number;
  stats_last_updated?: string;
}

export interface AccountsData {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  mutate: () => void;
  totalAccounts: number;
  agentAccounts: number;
  ensuranceAccounts: number;
  getAccountByFullName: (fullName: string) => Account | undefined;
  getAccountsByGroup: (groupName: string) => Account[];
}

export const useAccounts = (group?: string): AccountsData => {
  const { user, authenticated } = usePrivy();
  
  // Build the API URL with optional group filter
  const url = group ? `/api/accounts?group=${group}` : '/api/accounts';
  
  const { data, error, isLoading, mutate } = useSWR<Account[]>(
    url,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 2, // 2 minutes
      refreshInterval: 1000 * 60 * 5, // 5 minutes
    }
  );

  const accounts = data || [];
  
  // Computed values
  const totalAccounts = accounts.length;
  const agentAccounts = accounts.filter(acc => acc.is_agent).length;
  const ensuranceAccounts = accounts.filter(acc => 
    acc.group_name === '.ensurance' && acc.full_account_name !== 'situs.ensurance'
  ).length;

  // Helper functions
  const getAccountByFullName = (fullName: string): Account | undefined => {
    return accounts.find(acc => acc.full_account_name === fullName);
  };

  const getAccountsByGroup = (groupName: string): Account[] => {
    return accounts.filter(acc => acc.group_name === groupName);
  };

  return {
    accounts,
    loading: isLoading,
    error: error || null,
    mutate,
    totalAccounts,
    agentAccounts,
    ensuranceAccounts,
    getAccountByFullName,
    getAccountsByGroup,
  };
};

// Hook for a single account
export const useAccount = (fullAccountName: string) => {
  const { data, error, isLoading, mutate } = useSWR<Account>(
    fullAccountName ? `/api/accounts/${fullAccountName}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 2, // 2 minutes
    }
  );

  return {
    account: data,
    loading: isLoading,
    error: error || null,
    mutate,
  };
};

// Hook for account name availability check
export const useAccountNameCheck = (accountName: string, groupName: string) => {
  const { data, error, isLoading, mutate } = useSWR<{
    available: boolean;
    accountName: string;
    groupName: string;
    fullAccountName: string;
  }>(
    accountName && groupName ? `/api/accounts/check-name` : null,
    (url) => postFetcher(url, { accountName, groupName }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 5, // 5 minutes
    }
  );

  return {
    isAvailable: data?.available ?? null,
    loading: isLoading,
    error: error || null,
    mutate,
  };
};

// Helper function for POST requests
const postFetcher = async (url: string, data: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};