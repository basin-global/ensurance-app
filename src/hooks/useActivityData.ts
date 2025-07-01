import { useState, useEffect, useCallback } from 'react'

interface ActivityItem {
  id: string
  type: 'buy' | 'swap' | 'send' | 'burn'
  user: string
  token: string
  amount: string
  location?: string
  timestamp: Date
  value_usd?: string
}

interface ActivityData {
  activities: ActivityItem[]
  isLoading: boolean
  liveCount: number
  error?: string
}

// Mock data generator for demonstration
const generateMockActivity = (): ActivityItem => {
  const types: ActivityItem['type'][] = ['buy', 'swap', 'send', 'burn']
  const tokens = ['WATER', 'SOIL', 'AIR', 'CLEAN', 'TREE', 'REEF']
  const names = ['Alex', 'Sarah', 'Mike', 'Emma', 'Chris', 'Lisa', 'David', 'Anna']
  const locations = ['NYC', 'LA', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Toronto', 'Paris']
  
  const type = types[Math.floor(Math.random() * types.length)]
  const token = tokens[Math.floor(Math.random() * tokens.length)]
  const name = names[Math.floor(Math.random() * names.length)]
  const location = locations[Math.floor(Math.random() * locations.length)]
  
  const amount = (Math.random() * 1000 + 10).toFixed(2)
  const value_usd = (parseFloat(amount) * (Math.random() * 2 + 0.5)).toFixed(2)
  
  return {
    id: `${Date.now()}-${Math.random()}`,
    type,
    user: name,
    token,
    amount,
    location,
    timestamp: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
    value_usd
  }
}

// Generate initial mock data
const generateInitialData = (): ActivityItem[] => {
  return Array.from({ length: 20 }, () => generateMockActivity())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function useActivityData(): ActivityData {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [liveCount, setLiveCount] = useState(0)
  const [error, setError] = useState<string>()

  // Fetch real data from APIs
  const fetchActivityData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch from our new activity API
      const activityResponse = await fetch('/api/activity').catch(() => null)
      
      if (activityResponse?.ok) {
        const data = await activityResponse.json()
        setActivities(data.activities || [])
        setLiveCount(Math.floor(Math.random() * 50 + 10)) // Mock live count for now
        setError(undefined)
      } else {
        // Fallback to mock data if API fails
        const mockData = generateInitialData()
        setActivities(mockData)
        setLiveCount(Math.floor(Math.random() * 30 + 5))
      }
    } catch (err) {
      console.error('Failed to fetch activity data:', err)
      setError('Failed to load activity data')
      // Fallback to mock data
      setActivities(generateInitialData())
      setLiveCount(Math.floor(Math.random() * 20 + 5))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Simulate real-time updates
  const addNewActivity = useCallback(() => {
    const newActivity = generateMockActivity()
    newActivity.timestamp = new Date() // Make it current
    
    setActivities(prev => [newActivity, ...prev.slice(0, 19)]) // Keep last 20
    setLiveCount(prev => prev + Math.floor(Math.random() * 3)) // Random increment
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchActivityData()
  }, [fetchActivityData])

  // Simulate real-time updates every 15-30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) { // 70% chance of new activity
        addNewActivity()
      }
    }, Math.random() * 15000 + 15000) // 15-30 seconds

    return () => clearInterval(interval)
  }, [addNewActivity])

  return {
    activities,
    isLoading,
    liveCount,
    error
  }
}