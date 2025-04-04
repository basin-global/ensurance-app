'use client';

import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'
import { type SplitsClientConfig } from '@0xsplits/splits-sdk'
import { ReactNode } from 'react'

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http()
}) as any

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
    <SplitsProvider config={splitsConfig}>
      {children}
    </SplitsProvider>
  )
} 