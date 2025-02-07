'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Asset } from '@/types';
import { AssetDetailView } from '@/modules/assets/details/AssetDetailView';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getEnsuranceContractForChain } from '@/modules/certificates/config';
import { EnsuranceCollector, type TokenDetails } from '@/modules/certificates/collect/client';
import { formatEther } from 'viem';
import { SplitsBar } from '@/modules/splits/components/SplitsBar';
import { SaleActions } from '@/modules/certificates/collect';
import { ensure } from '@/modules/certificates/actions/ensure';
import { toast } from 'react-toastify';

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
  const { user, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [ensuranceData, setEnsuranceData] = useState<EnsuranceData | null>(null);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const contractAddress = getEnsuranceContractForChain(params.chain);

  useEffect(() => {
    const fetchCertificateDetails = async () => {
      if (!contractAddress) {
        setError('Invalid chain specified');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch both certificate and token details
        const [certificateResponse, tokenInfo] = await Promise.all([
          fetch(`/api/ensurance?chain=${params.chain}&tokenId=${params.tokenId}`),
          new EnsuranceCollector().getTokenDetails(
            params.chain as any, 
            BigInt(params.tokenId)
          )
        ]);

        if (!certificateResponse.ok) throw new Error('Failed to fetch certificate details');
        const data = await certificateResponse.json();
        
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
          contract_address: contractAddress
        };
        
        setAssetDetails(transformedData);
        setEnsuranceData(data);
        setTokenDetails(tokenInfo);
      } catch (err) {
        console.error('Error fetching certificate:', err);
        setError('Failed to fetch certificate details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateDetails();
  }, [params.chain, params.tokenId, contractAddress]);

  const handleEnsure = async (quantity: number) => {
    if (!authenticated) {
      login();
      return;
    }

    const wallet = wallets[0];
    if (!wallet?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const result = await ensure({
        chain: params.chain as any,
        tokenId: assetDetails.token_id,
        recipient: wallet.address as `0x${string}`,
        quantity
      });

      if (!result.success) {
        throw new Error('Failed to prepare transaction');
      }

      const provider = await wallet.getEthereumProvider();

      // Switch to the correct chain first
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${result.chainId.toString(16)}` }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          toast.error('Please add this network to your wallet first');
          return;
        }
        throw switchError;
      }

      // Handle ERC20 token payment if required
      if (result.erc20Approval) {
        const approvalParams = convertBigInts(result.erc20Approval);
        
        // First approve the token spend
        const approvalTx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            ...approvalParams,
            from: wallet.address
          }]
        });

        // Wait a bit for the approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Send the mint transaction
      const finalTxParams = {
        ...result.parameters,
        from: wallet.address
      };

      await provider.request({
        method: 'eth_sendTransaction',
        params: [finalTxParams]
      });

      toast.success('Successfully ensured certificate!');
    } catch (error: any) {
      console.error('Error ensuring:', error);
      if (error.code === 4001) {
        toast.error('Transaction was cancelled');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to ensure certificate');
      }
    }
  };

  // Helper function for BigInt conversion
  const convertBigInts = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (typeof obj === 'bigint') return `0x${obj.toString(16)}`;
    
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[key] = convertBigInts(value);
      return acc;
    }, {} as any);
  };

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
      >
        {tokenDetails && (
          <div className="mb-6 space-y-6">
            {/* Token Info */}
            <div className="p-4 bg-gray-900 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Total Ensured</p>
                  <p className="font-mono">
                    {Number(tokenDetails.totalMinted).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Price</p>
                  <div className="font-mono">
                    {tokenDetails.paymentToken ? (
                      <div className="flex items-center space-x-1">
                        <span>{(Number(tokenDetails.mintPrice) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)}</span>
                        <span className="text-gray-400">{tokenDetails.paymentToken.symbol}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>{Number(formatEther(tokenDetails.mintPrice)).toFixed(4)}</span>
                        <span className="text-gray-400">ETH</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className={`font-mono ${tokenDetails.primaryMintActive ? 'text-green-500' : 'text-red-500'}`}>
                    {tokenDetails.primaryMintActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {tokenDetails.saleStart && Number(tokenDetails.saleStart) > Date.now() / 1000 && (
                  <div>
                    <p className="text-gray-400">Starts</p>
                    <p className="font-mono">
                      {new Date(Number(tokenDetails.saleStart) * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
                {tokenDetails.saleEnd && Number(tokenDetails.saleEnd) > 0 && (
                  <div>
                    <p className="text-gray-400">Ends</p>
                    <p className="font-mono">
                      {new Date(Number(tokenDetails.saleEnd) * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
                {tokenDetails.minimumMarketEth && (
                  <div>
                    <p className="text-gray-400">Min Market ETH</p>
                    <p className="font-mono">
                      {Number(formatEther(tokenDetails.minimumMarketEth)).toFixed(6)} ETH
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Market Info */}
            {tokenDetails.secondaryActive && (
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Secondary Market</h3>
                <div className="grid grid-cols-2 gap-4">
                  {tokenDetails.secondaryToken && (
                    <>
                      <div>
                        <p className="text-gray-400">Trading Token</p>
                        <p className="font-mono">{tokenDetails.secondaryToken.symbol}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Token Name</p>
                        <p className="font-mono">{tokenDetails.secondaryToken.name}</p>
                      </div>
                    </>
                  )}
                  {tokenDetails.secondaryCountdown && (
                    <>
                      <div>
                        <p className="text-gray-400">Countdown Time</p>
                        <p className="font-mono">{tokenDetails.secondaryCountdown.timeInSeconds.toString()} seconds</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Required Mints</p>
                        <p className="font-mono">{tokenDetails.secondaryCountdown.minimumMints.toString()}</p>
                      </div>
                    </>
                  )}
                  {tokenDetails.secondaryPool && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Trading Pool</p>
                      <p className="font-mono break-all">{tokenDetails.secondaryPool}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sale Actions */}
            <SaleActions
              asset={assetDetails}
              tokenDetails={tokenDetails}
              onEnsure={handleEnsure}
            />

            {/* Splits Bar */}
            {ensuranceData?.creator_reward_recipient_split && (
              <a 
                href={`/flow/${params.chain}/${ensuranceData.creator_reward_recipient}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-background dark:bg-background-dark rounded-xl hover:bg-gray-900 transition-colors duration-200"
              >
                <SplitsBar 
                  recipients={ensuranceData.creator_reward_recipient_split.recipients} 
                />
              </a>
            )}
          </div>
        )}
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
    </>
  );
} 