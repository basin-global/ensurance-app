import { SWRConfiguration } from 'swr'

// Default fetcher function
export const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
})

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  // Revalidate on window focus for real-time data
  revalidateOnFocus: true,
  // Revalidate on network reconnect
  revalidateOnReconnect: true,
  // Deduplicate requests within 2 seconds
  dedupingInterval: 2000,
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  // Focus throttle to prevent excessive requests
  focusThrottleInterval: 5000,
  // Keep previous data while revalidating
  keepPreviousData: true,
  // Fallback data for failed requests
  fallback: {},
}

// Specialized configurations for different data types
export const blockchainConfig: SWRConfiguration = {
  ...swrConfig,
  // More frequent updates for blockchain data
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
  dedupingInterval: 5000, // 5 seconds for blockchain data
}

export const priceConfig: SWRConfiguration = {
  ...swrConfig,
  // Frequent updates for price data
  refreshInterval: 60000, // 1 minute
  revalidateOnFocus: true,
  dedupingInterval: 10000, // 10 seconds for price data
}

export const userDataConfig: SWRConfiguration = {
  ...swrConfig,
  // Less frequent updates for user data
  refreshInterval: 120000, // 2 minutes
  revalidateOnFocus: false,
  dedupingInterval: 30000, // 30 seconds for user data
}

export const searchConfig: SWRConfiguration = {
  ...swrConfig,
  // No automatic refresh for search
  refreshInterval: 0,
  revalidateOnFocus: false,
  dedupingInterval: 1000, // 1 second for search
}