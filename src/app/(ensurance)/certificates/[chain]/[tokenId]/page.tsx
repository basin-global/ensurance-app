'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { isSpamContract } from '@/config/spamContracts';
import { Asset, EnsureOperation } from '@/types';
import { AssetDetailView } from '@/modules/assets/details/AssetDetailView';
import { CertificateActions } from '@/modules/ensurance/details/CertificateActions';
import { useSite } from '@/contexts/site-context';
import { getApiPrefix } from '@/lib/config/routes';
import { usePrivy } from '@privy-io/react-auth';
import { EnsureModal } from '@/modules/ensure/ensure-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getEnsuranceContractForChain } from '@/modules/ensurance/config';

interface CertificatePageProps {
  params: {
    chain: string;
    tokenId: string;
  };
}

type EnsuranceData = {
  creator_reward_recipient: string;
  creator_reward_recipient_split?: {
    recipients: Array<{
      percentAllocation: number;
      recipient: {
        address: string;
        ens?: string;
      }
    }>
  };
  audio_url?: string;
  mime_type?: string;
};

export default function CertificatePage({ params }: CertificatePageProps) {
  const pathname = usePathname();
  const site = useSite();
  const apiPrefix = getApiPrefix(site);
  const { user, authenticated, login } = usePrivy();
  
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [ensuranceData, setEnsuranceData] = useState<EnsuranceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEnsureModal, setShowEnsureModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<EnsureOperation | null>(null);
  
  const contractAddress = getEnsuranceContractForChain(params.chain);
  const isSpam = isSpamContract(params.chain, contractAddress);

  useEffect(() => {
    const fetchCertificateDetails = async () => {
      if (!contractAddress) {
        setError('Invalid chain specified');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${apiPrefix}/ensurance?chain=${params.chain}&tokenId=${params.tokenId}`);
        if (!response.ok) throw new Error('Failed to fetch certificate details');
        const data = await response.json();
        
        console.log('Certificate API Response:', {
          mime_type: data.mime_type,
          animation_url: data.animation_url,
          animation_url_ipfs: data.animation_url_ipfs,
          full: data
        });
        
        // Transform Ensurance data to match Asset type structure
        const transformedData = {
          ...data,
          chain: params.chain,
          token_id: params.tokenId,
          image_url: data.image_ipfs ? `https://ipfs.io/ipfs/${data.image_ipfs}` : null,
          video_url: data.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${data.animation_url_ipfs}` : null,
          audio_url: data.mime_type?.startsWith('audio/') ? `https://ipfs.io/ipfs/${data.animation_url_ipfs}` : null,
          mime_type: data.mime_type,
          collection: { name: 'Ensurance' },
          nft_id: `${params.chain}-${params.tokenId}`,
          contract_address: 'ensurance'
        };
        
        console.log('Transformed Certificate Data:', transformedData);
        
        setAssetDetails(transformedData);
        setEnsuranceData(data);
      } catch (err) {
        console.error('Error fetching certificate:', err);
        setError('Failed to fetch certificate details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateDetails();
  }, [params.chain, params.tokenId, apiPrefix, contractAddress]);

  const handleOperation = useCallback((operation: EnsureOperation) => {
    if (!authenticated) {
      setShowLoginModal(true);
      return;
    }
    setSelectedOperation(operation);
    setShowEnsureModal(true);
  }, [authenticated]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading certificate details...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">{error}</div>;
  }

  if (!assetDetails || !contractAddress) {
    return <div className="flex justify-center items-center h-screen">Certificate not found</div>;
  }

  return (
    <>
      <AssetDetailView
        asset={assetDetails}
        isSpam={isSpam}
      >
        <CertificateActions
          asset={assetDetails}
          ensuranceData={ensuranceData}
          onEnsureClick={handleOperation}
          chain={params.chain}
        />
      </AssetDetailView>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-gray-900 border border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-mono font-bold text-white text-center">
              Login Required
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="mb-6 text-gray-300">
              Please login to perform this action.
            </p>
            <Button 
              onClick={() => {
                login();
                setShowLoginModal(false);
              }}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold transition-all duration-200"
            >
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ensure Modal */}
      {showEnsureModal && assetDetails && (
        <EnsureModal
          isOpen={showEnsureModal}
          onClose={() => setShowEnsureModal(false)}
          operation={selectedOperation || 'ensure'}
          asset={assetDetails}
          address={user?.wallet?.address || ''}
          isTokenbound={false}
          onAction={async () => ({ hash: '' })}
        />
      )}
    </>
  );
} 