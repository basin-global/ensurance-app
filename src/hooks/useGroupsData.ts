import { useState, useEffect } from 'react'

export interface GroupData {
  group_name: string
  contract_address: string
  is_active: boolean
  name_front?: string
  tagline?: string
  description?: string
  total_supply?: number
}

export interface GroupsDataResult {
  groups: GroupData[]
  loading: boolean
  error: string | null
  refetch: () => void
  totalGroups: number
  activeGroups: number
  inactiveGroups: number
}

export const useGroupsData = (includeInactive: boolean = false): GroupsDataResult => {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = includeInactive 
        ? '/api/groups?include_inactive=true' 
        : '/api/groups'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch groups')
      
      const data = await response.json()
      setGroups(data)
    } catch (err) {
      console.error('Error fetching groups:', err)
      setError('Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [includeInactive])

  const totalGroups = groups.length
  const activeGroups = groups.filter(group => group.is_active).length
  const inactiveGroups = totalGroups - activeGroups

  return {
    groups,
    loading,
    error,
    refetch: fetchGroups,
    totalGroups,
    activeGroups,
    inactiveGroups
  }
} 