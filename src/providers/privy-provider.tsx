'use client'

import { PrivyProvider } from '@privy-io/react-auth';
import { supportedChains, getActiveChains } from '@/config/chains';
import { useEffect, useState } from 'react';

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const activeChains = getActiveChains();
  const baseChain = supportedChains.find(chain => chain.id === 8453); // Base

  // Only render provider after component mounts
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
        defaultChain: baseChain,
        supportedChains: activeChains,
        appearance: { walletList: ['metamask', 'coinbase_wallet', 'wallet_connect'] },
        externalWallets: {  
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly'
          },
          walletConnect: {
            enabled: true
          }
        }
      }}
    >
      {children}
    </PrivyProvider>
  )
}
