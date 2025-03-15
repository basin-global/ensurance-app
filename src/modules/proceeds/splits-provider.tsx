'use client';

import { createPublicClient, http, Client, PublicClient, Transport, Chain } from 'viem'
import { mainnet } from 'viem/chains'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'
import { type SplitsClientConfig } from '@0xsplits/splits-sdk'
import { ReactNode } from 'react'

// Create public client following the docs example
const baseClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

// Create a client with the correct account type
const publicClient = {
  ...baseClient,
  account: undefined
} as unknown as Client<Transport, Chain, undefined>

// Config using their recommended structure
const splitsConfig: SplitsClientConfig = {
  chainId: mainnet.id,
  publicClient,
  includeEnsNames: true,
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