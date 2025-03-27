'use client';

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'
import { type SplitsClientConfig } from '@0xsplits/splits-sdk'
import { ReactNode } from 'react'

// Create public client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

// Config using their recommended structure
const splitsConfig: SplitsClientConfig = {
  chainId: mainnet.id
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