'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

// Global SWR configuration optimized for blockchain data
const swrConfig = {
  // Default fetcher for API routes
  fetcher: async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },
  
  // Aggressive caching for blockchain data
  revalidateOnFocus: false, // Don't refetch when window gains focus
  revalidateOnReconnect: false, // Don't refetch on reconnect
  revalidateIfStale: false, // Don't automatically revalidate stale data
  
  // Cache settings
  dedupingInterval: 1000 * 60 * 5, // 5 minutes - dedupe requests within this window
  focusThrottleInterval: 1000 * 60 * 10, // 10 minutes - throttle focus events
  
  // Error handling
  errorRetryCount: 2,
  errorRetryInterval: 1000 * 5, // 5 seconds between retries
  
  // Optimistic updates
  keepPreviousData: true,
  
  // Provider-specific settings
  provider: () => new Map(),
  
  // Custom error handling
  onError: (error: Error, key: string) => {
    console.error(`SWR Error for key "${key}":`, error);
  },
  
  // Custom success handling
  onSuccess: (data: any, key: string) => {
    // Log successful fetches in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`SWR Success for key "${key}":`, data);
    }
  }
};

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}

// Custom fetcher for authenticated requests
export const authenticatedFetcher = async (url: string, token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Custom fetcher for POST requests
export const postFetcher = async (url: string, data: any) => {
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

// Custom fetcher for form data
export const formDataFetcher = async (url: string, formData: FormData) => {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};