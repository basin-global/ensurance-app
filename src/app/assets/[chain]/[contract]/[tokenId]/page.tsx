'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isSpamContract } from '@/config/spamContracts';
import { Asset } from '@/types';
import { AssetDetailView } from '@/modules/assets/details/AssetDetailView';
import { useSite } from '@/contexts/site-context';
import { getApiPrefix, getBasePath } from '@/config/routes';
import { isEnsuranceToken } from '@/modules/ensurance/config';

interface AssetPageProps {
  params: {
    chain: string;
    contract: string;
    tokenId: string;
  };
}

export default function AssetPage({ params }: AssetPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const site = useSite();
  const apiPrefix = getApiPrefix(site);
  
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSpam = isSpamContract(params.chain, params.contract);

  useEffect(() => {
    // Early return if we're already on a certificate page
    if (pathname.includes('/certificates/')) {
      return;
    }

    // Check if this is an Ensurance token before any data fetching
    if (isEnsuranceToken(params.chain, params.contract)) {
      const certificatePath = `${getBasePath(site)}/certificates/${params.chain}/${params.tokenId}`;
      router.replace(certificatePath);
      return;
    }

    // Only fetch if not an Ensurance token
    const fetchAssetDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${apiPrefix}/simplehash/nft?chain=${params.chain}&contractAddress=${params.contract}&tokenId=${params.tokenId}`
        );
        if (!response.ok) throw new Error('Failed to fetch asset details');
        const data = await response.json();
        setAssetDetails(data);
      } catch (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to fetch asset details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssetDetails();
  }, [params.chain, params.contract, params.tokenId, apiPrefix, router, pathname, site]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading asset details...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">{error}</div>;
  }

  if (!assetDetails) {
    return <div className="flex justify-center items-center h-screen">Asset not found</div>;
  }

  return (
    <AssetDetailView
      asset={assetDetails}
      isSpam={isSpam}
    />
  );
} 