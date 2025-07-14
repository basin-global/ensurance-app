import useSWR from 'swr';

export interface Group {
  group_name: string;
  contract_address: string;
  is_active: boolean;
  name_front?: string;
  tagline?: string;
  description?: string;
  total_supply?: number;
  name?: string;
  email?: string;
  chat?: string;
  website?: string;
  group_ensurance?: string | boolean;
}

export interface GroupsData {
  groups: Group[];
  loading: boolean;
  error: Error | null;
  mutate: () => void;
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  getGroupByName: (groupName: string) => Group | undefined;
  getActiveGroups: () => Group[];
  getInactiveGroups: () => Group[];
}

export const useGroups = (includeInactive: boolean = false): GroupsData => {
  const url = includeInactive 
    ? '/api/groups?include_inactive=true' 
    : '/api/groups';
  
  const { data, error, isLoading, mutate } = useSWR<Group[]>(
    url,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10, // 10 minutes - groups don't change often
      refreshInterval: 1000 * 60 * 30, // 30 minutes
    }
  );

  const groups = data || [];
  
  // Computed values
  const totalGroups = groups.length;
  const activeGroups = groups.filter(group => group.is_active).length;
  const inactiveGroups = totalGroups - activeGroups;

  // Helper functions
  const getGroupByName = (groupName: string): Group | undefined => {
    return groups.find(group => group.group_name === groupName);
  };

  const getActiveGroups = (): Group[] => {
    return groups.filter(group => group.is_active);
  };

  const getInactiveGroups = (): Group[] => {
    return groups.filter(group => !group.is_active);
  };

  return {
    groups,
    loading: isLoading,
    error: error || null,
    mutate,
    totalGroups,
    activeGroups,
    inactiveGroups,
    getGroupByName,
    getActiveGroups,
    getInactiveGroups,
  };
};

// Hook for a single group
export const useGroup = (groupName: string) => {
  const { data, error, isLoading, mutate } = useSWR<Group>(
    groupName ? `/api/groups?group_name=${groupName}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10, // 10 minutes
    }
  );

  return {
    group: data,
    loading: isLoading,
    error: error || null,
    mutate,
  };
};

// Hook for creating a new group
export const useCreateGroup = () => {
  const { data, error, isLoading, mutate } = useSWR<Group>(
    null, // No initial data
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const createGroup = async (groupData: Partial<Group>) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const newGroup = await response.json();
      mutate(); // Invalidate groups cache
      return newGroup;
    } catch (err) {
      throw err;
    }
  };

  return {
    createGroup,
    loading: isLoading,
    error: error || null,
  };
};