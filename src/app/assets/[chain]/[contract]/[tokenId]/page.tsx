'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isSpamContract } from '@/config/spamContracts';
import Image from 'next/image';
import CustomAudioPlayer from '@/components/CustomAudioPlayer';
import { usePrivy } from '@privy-io/react-auth';
import { Maximize2, Minimize2, Send, RefreshCw, DollarSign, ArrowLeftRight, Trash2, EyeOff, Plus, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Add type for ensurance data
type EnsuranceData = {
  creator_reward_recipient: string;  // 0x address
  creator_reward_recipient_split: {
    recipients: Array<{
      percentAllocation: number;
      recipient: {
        address: string;
        ens?: string;
      }
    }>
  };
};

// Add constant for description character limit
const DESCRIPTION_CHAR_LIMIT = 300;

export default function AssetDetailPage({ params }: { params: { chain: string; contract: string; tokenId: string } }) {
  const router = useRouter();
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const isSpam = isSpamContract(params.chain, params.contract);
  const { user, authenticated, login } = usePrivy();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEnsureModal, setShowEnsureModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<EnsureOperation | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [ensuranceData, setEnsuranceData] = useState<EnsuranceData | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const isEnsurance = isEnsuranceToken(params.chain, params.contract);
  const quantity = assetDetails?.owners?.[0]?.quantity || 0;
  const isOwner = useMemo(() => {
    if (!user?.wallet?.address || !assetDetails?.owners?.[0]) return false;
    return user.wallet.address.toLowerCase() === assetDetails.owners[0].owner_address.toLowerCase();
  }, [user?.wallet?.address, assetDetails?.owners]);

  const fetchAssetDetails = useMemo(() => async () => {
    setLoading(true);
    try {
      // If we're on the ensurance route, use our DB
      if (window.location.pathname.includes('/ensurance/')) {
        const response = await fetch(`/api/getEnsurance?chain=${params.chain}&tokenId=${params.tokenId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Ensurance details from DB:', data);
        setAssetDetails(data);
        setEnsuranceData(data); // We already have the splits data
      } else {
        // For non-ensurance assets, use SimpleHash
        const response = await fetch(`/api/simplehash/nft?chain=${params.chain}&contractAddress=${params.contract}&tokenId=${params.tokenId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Asset details from SimpleHash:', data);
        setAssetDetails(data);
      }
    } catch (error) {
      console.error('Error fetching asset details:', error);
      setError('Failed to fetch asset details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [params.chain, params.contract, params.tokenId]);

  useEffect(() => {
    const checkForRedirect = async () => {
      if (hasRedirected) return;

      // Skip redirect if we're on the ensurance path
      if (window.location.pathname.includes('/ensurance/')) {
        fetchAssetDetails();
        return;
      }

      // Only redirect to ensurance path if this is an ensurance token
      if (isEnsuranceToken(params.chain, params.contract)) {
        console.log('Asset: Redirecting to ensurance path:', `/assets/${params.chain}/ensurance/${params.tokenId}`);
        setHasRedirected(true);
        router.replace(`/assets/${params.chain}/ensurance/${params.tokenId}`);
        return;
      }
      
      // Then check for OG account (existing logic)
      console.log('Asset: Checking for OG account with params:', { contract: params.contract, tokenId: params.tokenId });
      try {
        const response = await fetch(`/api/getAccountByToken?contract=${params.contract}&tokenId=${params.tokenId}`);
        console.log('Asset: API response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to fetch account');
        const data = await response.json();
        console.log('Asset: Received data:', data);
        
        if (data?.og_name && data?.account_name) {
          const redirectPath = `/${data.og_name.replace(/^\./, '')}/${data.account_name}`;
          console.log('Asset: Redirecting to:', redirectPath);
          setHasRedirected(true);
          router.replace(redirectPath);
          return;
        }
        
        fetchAssetDetails();
      } catch (error) {
        console.error('Asset Error:', error);
        fetchAssetDetails();
      }
    };

    checkForRedirect();
  }, [params.contract, params.tokenId, router, hasRedirected, fetchAssetDetails, params.chain]);

  useEffect(() => {
    if (user?.wallet?.address) {
      setAddress(user.wallet.address);
    }
  }, [user?.wallet?.address]);

  useEffect(() => {
    const fetchEnsuranceData = async () => {
      if (isEnsurance && !window.location.pathname.includes('/ensurance/')) {
        return; // Don't fetch if we haven't redirected yet
      }

      if (isEnsurance) {
        try {
          const response = await fetch(`/api/getEnsurance?chain=${params.chain}&tokenId=${params.tokenId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Ensurance data:', data);
            setEnsuranceData(data);
          }
        } catch (error) {
          console.error('Error fetching ensurance data:', error);
        }
      }
    };

    fetchEnsuranceData();
  }, [isEnsurance, params.chain, params.tokenId]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Toggle body overflow to prevent scrolling in fullscreen
    document.body.style.overflow = !isFullscreen ? 'hidden' : 'auto';
  };

  const handleOperation = useCallback((operation: string) => {
    if (!authenticated) {
      setShowLoginModal(true);
      return;
    }
    setSelectedOperation(operation as EnsureOperation);
    setShowEnsureModal(true);
  }, [authenticated]);

  const handleBack = () => {
    // Try to get referrer
    const referrer = document.referrer;
    
    // If we have a referrer and it's from our site, use it
    if (referrer && referrer.includes(window.location.host)) {
      router.back();
    } else {
      // Otherwise go home
      router.push('/');
    }
  };

  const ensureMenuComponent = useMemo(() => (
    authenticated && (
      <EnsureMenu
        isTokenbound={false}
        onOperationSelect={handleOperation}
        asset={{
          chain: params.chain,
          contract_address: params.contract,
        }}
      />
    )
  ), [authenticated, params.chain, params.contract, handleOperation]);

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
    <div className="min-h-screen bg-background dark:bg-background-dark">
      {isFullscreen ? (
        // Fullscreen view
        <div className="fixed inset-0 z-50 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            {assetDetails?.video_url ? (
              <video
                className="max-h-screen max-w-screen object-contain"
                controls
                autoPlay
                loop
                muted
                src={assetDetails.video_url}
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={assetDetails?.image_url || ''}
                  alt={assetDetails?.name || 'Asset Image'}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white"
            >
              <Minimize2 size={24} />
            </button>
          </div>
        </div>
      ) : (
        // Regular view
        <div className="container max-w-5xl mx-auto px-4 py-8">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>

          {isSpam && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Warning!</strong>
              <span className="block sm:inline"> This contract has been marked as spam.</span>
            </div>
          )}
          
          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6 mx-auto">
            {/* Left Column - Media */}
            <div className="lg:w-[58%]">
              <div className="relative w-full bg-background dark:bg-background-dark rounded-2xl">
                {assetDetails?.video_url ? (
                  <div className="relative w-full">
                    <div className="group">
                      <video
                        className="w-full object-contain rounded-2xl"
                        controls
                        autoPlay
                        loop
                        muted
                        src={assetDetails.video_url}
                      />
                      <button
                        onClick={toggleFullscreen}
                        className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 size={24} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <div className="group">
                      <div className="relative w-full">
                        <Image
                          src={assetDetails?.image_url || ''}
                          alt={assetDetails?.name || 'Asset Image'}
                          width={1200}
                          height={675}
                          className="w-full h-auto rounded-2xl object-contain"
                          priority
                        />
                        {assetDetails?.mime_type?.startsWith('audio/') && assetDetails?.audio_url && (
                          <div className="absolute bottom-4 left-4 right-4">
                            <CustomAudioPlayer src={assetDetails.audio_url} />
                          </div>
                        )}
                        <button
                          onClick={toggleFullscreen}
                          className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="lg:w-[36%]">
              <div className="flex flex-col h-full">
                {/* Asset Name */}
                <h1 className="text-3xl font-bold text-gray-200 mb-4">
                  {assetDetails?.name || 'Unnamed Asset'}
                </h1>

                {/* Description with character limit */}
                <div className="mb-6">  {/* Increased margin bottom */}
                  <div className="prose dark:prose-invert">
                    {assetDetails?.description && (
                      <>
                        <div className={showFullDescription ? '' : 'relative'}>
                          <ReactMarkdown>
                            {showFullDescription 
                              ? assetDetails.description 
                              : assetDetails.description.slice(0, DESCRIPTION_CHAR_LIMIT) + '...'}
                          </ReactMarkdown>
                          {!showFullDescription && assetDetails.description.length > DESCRIPTION_CHAR_LIMIT && (
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background dark:from-background-dark to-transparent" />
                          )}
                        </div>
                        {assetDetails.description.length > DESCRIPTION_CHAR_LIMIT && (
                          <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="mt-2 text-sm text-gray-400 hover:text-gray-200"
                          >
                            {showFullDescription ? 'Show Less' : 'Show More'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Ensure Button and Splits Bar moved up */}
                {isEnsurance && (
                  <div className="flex flex-col gap-4">
                    <Button 
                      onClick={() => handleOperation('ensure')}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600"
                    >
                      <Plus className="h-6 w-6 mr-2" />
                      ENSURE
                    </Button>

                    {ensuranceData?.creator_reward_recipient_split && (
                      <a 
                        href={`/flow/${params.chain}/${ensuranceData.creator_reward_recipient}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full p-4 bg-background dark:bg-background-dark rounded-xl hover:bg-gray-900 transition-colors duration-200"
                      >
                        <SplitsBar 
                          recipients={ensuranceData.creator_reward_recipient_split.recipients} 
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="mt-8 p-6 bg-gray-800 rounded-lg mx-auto" style={{ width: '66%' }}>
            <h2 className="text-xl font-semibold mb-3 text-gray-200">Data</h2>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-8">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Collection</p>
                  <p className="text-gray-200 text-sm font-mono">
                    {isEnsurance ? 'Ensurance' : truncateAddress(assetDetails.contract_address || '')}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 capitalize">{params.chain}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">ID</p>
                  <p className="text-gray-200 text-sm font-mono">{assetDetails.token_id}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <a
                  href={`https://rarible.com/token/base/${params.contract}:${params.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image
                    src="/assets/icons/rarible.svg"
                    alt="View on Rarible"
                    width={24}
                    height={24}
                  />
                </a>
                <a
                  href={`https://opensea.io/assets/${params.chain}/${params.contract}/${params.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image
                    src="/assets/icons/opensea.svg"
                    alt="View on OpenSea"
                    width={24}
                    height={24}
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {showEnsureModal && (
        <EnsureModal
          isOpen={showEnsureModal}
          onClose={() => setShowEnsureModal(false)}
          operation={selectedOperation || 'ensure'}
          asset={assetDetails || {
            chain: params.chain,
            contract_address: params.contract,
            token_id: params.tokenId,
            queried_wallet_balances: [{
              quantity_string: '0',
              value_usd_string: '0'
            }]
          } as Asset}
          address={address}
          isTokenbound={false}
          onAction={async () => ({ hash: '' })}
        />
      )}
    </div>
  );
}

// Helper function to truncate address
const truncateAddress = (address: string) => {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
