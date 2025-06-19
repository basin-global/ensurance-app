'use client'

import { PrivyProvider } from '@privy-io/react-auth';
import { supportedChains, getActiveChains } from '@/config/chains';
import { useEffect, useState } from 'react';

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const activeChains = getActiveChains();
  const baseChain = supportedChains.find(chain => chain.id === 8453); // Base

  // Environment-based wallet configuration
  const getWalletList = (): ('metamask' | 'coinbase_wallet' | 'wallet_connect')[] => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      // In development, show all wallets for testing
      return ['metamask', 'coinbase_wallet', 'wallet_connect'];
    } else {
      // In production, only show MetaMask
      return ['metamask'];
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['wallet'],
        defaultChain: baseChain,
        supportedChains: activeChains,
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e', // Green-500 to match your UI
          showWalletLoginFirst: true,
          walletList: getWalletList(),
          logo: '/groups/orbs/ensurance-orb.png',
          landingHeader: 'connect',
          loginMessage: 'ensurance.app'
        }
      }}
    >
      {children}
    </PrivyProvider>
  )
}
