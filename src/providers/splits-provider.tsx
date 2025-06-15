'use client';

import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'
import { type SplitsClientConfig } from '@0xsplits/splits-sdk'
import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http()
}) as any

// Create React Query client with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
})

// Config using their recommended structure
const splitsConfig: SplitsClientConfig = {
  chainId: base.id,
  publicClient,
  includeEnsNames: false,
  apiConfig: {
    apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY || ''
  }
}

interface SplitsWrapperProps {
  children: ReactNode
}

export function SplitsWrapper({ children }: SplitsWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SplitsProvider config={splitsConfig}>
        {children}
      </SplitsProvider>
    </QueryClientProvider>
  )
} 