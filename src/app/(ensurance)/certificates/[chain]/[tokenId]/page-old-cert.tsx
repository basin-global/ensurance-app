'use client';

import { useEffect } from 'react';
import { getEnsuranceContractForChain } from '@/modules/ensurance/config';
import AssetDetailPage from '@/app/assets/[chain]/[contract]/[tokenId]/page';
import { usePathname } from 'next/navigation';
import { useSite } from '@/contexts/site-context';

interface EnsurancePageProps {
  params: {
    chain: string;
    tokenId: string;
  };
}

export default function CertificatesPage({ params }: EnsurancePageProps) {
  const pathname = usePathname();
  const site = useSite();

  // Get the contract address for this chain
  const contractAddress = getEnsuranceContractForChain(params.chain);

  console.log('CertificatesPage: Rendering with params:', { 
    chain: params.chain, 
    tokenId: params.tokenId,
    contractAddress,
    site,
    pathname 
  });

  // If we have a contract address, render the asset detail page with those params
  if (contractAddress) {
    return (
      <div className="min-h-screen bg-background">
        <AssetDetailPage 
          params={{ 
            chain: params.chain, 
            contract: contractAddress, 
            tokenId: params.tokenId 
          }}
        />
      </div>
    );
  }

  // Return error message if no contract found
  return <div className="flex justify-center items-center h-screen">Invalid chain specified</div>;
} 