'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TabbedModules } from '@/modules/tabs/TabbedModules';
import { toast } from 'react-toastify';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import SitusOGAbi from '@/abi/SitusOG.json';
import { useSearchParams } from 'next/navigation';
import AccountImage from '@/modules/accounts/AccountImage';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

interface AccountContractInfoProps {
  token_id: number;
}

export default function AccountPage({ params }: { params: { og: string; 'account-name': string } }) {
  const { og, 'account-name': account_name } = params;
  const searchParams = useSearchParams();
  const initialModule = searchParams.get('module');
  const initialChain = searchParams.get('chain');
  
  const { currentOG } = useOG();
  const [account, setAccount] = useState<OgAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnchainData, setShowOnchainData] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const { wallets } = useWallets();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const { authenticated, user } = usePrivy();
  const [showFullImage, setShowFullImage] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const response = await fetch(`/api/${og}/${account_name}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Account not found');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
        const data = await response.json();
        console.log('Account data from API:', data);
        setAccount({
          ...data,
          token_id: Number(data.token_id)
        });
      } catch (err) {
        console.error('Error fetching account:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccount();
  }, [og, account_name]);

  useEffect(() => {
    const fetchEnsName = async () => {
      if (account?.tba_address) {
        try {
          console.log('Account Page - Fetching ENS for TBA address:', account.tba_address);
          const response = await fetch(`/api/simplehash/ens?address=${account.tba_address}`);
          const data = await response.json();
          console.log('Account Page - ENS name:', data.name);
          setEnsName(data.name);
        } catch (error) {
          console.error('Account Page - Error fetching ENS name:', error);
        }
      }
    };

    fetchEnsName();
  }, [account?.tba_address]);

  useEffect(() => {
    const checkOwnership = async () => {
      console.log('=== TBA Ownership Check ===');
      
      if (!authenticated || !user?.wallet?.address || !account?.token_id || !currentOG?.contract_address) {
        console.log('Ownership check failed - missing data');
        setIsOwner(false);
        return;
      }

      try {
        const address = currentOG.contract_address as Address;
        const bigIntTokenId = BigInt(account.token_id);

        // Get the owner directly from the contract
        const owner = await publicClient.readContract({
          address,
          abi: SitusOGAbi,
          functionName: 'ownerOf',
          args: [bigIntTokenId],
        }) as `0x${string}`; // Type assertion to help TypeScript

        const ownershipResult = user.wallet.address.toLowerCase() === owner.toLowerCase();
        console.log('TBA Ownership result:', {
          userWallet: user.wallet.address.toLowerCase(),
          owner: owner.toLowerCase(),
          isOwner: ownershipResult
        });

        setIsOwner(ownershipResult);
      } catch (error) {
        console.error('Error checking ownership:', error);
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [authenticated, user?.wallet?.address, account?.token_id, currentOG?.contract_address]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Account address copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy TBA address');
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOnchainData(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-foreground dark:text-foreground-dark bg-background dark:bg-background-dark">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-foreground dark:text-foreground-dark bg-background dark:bg-background-dark">
        <h1 className="text-3xl font-bold mb-4">Account Not Found</h1>
        <p className="text-xl mb-6">This account does not seem to exist. Please check the account name and the onchain group name and try again.</p>
        <Link href={`/${og}/accounts/all`} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          See All Accounts
        </Link>
      </div>
    );
  }

  console.log('Account page ownership:', {
    authenticated,
    userWallet: user?.wallet?.address,
    tbaAddress: account?.tba_address,
    isOwner
  });

  console.log('Current account state:', account);

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="container mx-auto px-0 bg-background dark:bg-background-dark text-foreground dark:text-foreground-dark min-h-screen">
        <div className="w-full lg:max-w-6xl lg:mx-auto">
          <div className="mb-4 flex justify-center">
            <SubNavigation type="accounts" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-none lg:rounded-lg shadow-md p-0 md:p-4 w-full">
            <div className="relative max-w-3xl mx-auto group/main px-4 md:px-0 py-2">
              <div className="flex-1">
                {account.tba_address ? (
                  <div 
                    onClick={() => copyToClipboard(account.tba_address!)}
                    className="cursor-pointer text-center py-2 hover:bg-gray-700/10 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 opacity-0 group-hover/main:opacity-70 transition-opacity duration-300 delay-300">
                      {account.tba_address}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-center mb-1 text-gray-600 dark:text-gray-400">
                    TBA address not available
                  </p>
                )}

                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 flex-shrink-0 relative">
                      {account.token_id ? (
                        <div 
                          onClick={() => account.token_id && setShowFullImage(true)}
                          className={`${account.token_id ? 'cursor-pointer group/image' : ''}`}
                        >
                          <AccountImage tokenId={account.token_id} />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-30 transition-all duration-200 rounded-full flex items-center justify-center">
                            <svg 
                              className="w-6 h-6 text-white opacity-0 group-hover/image:opacity-100 transition-opacity duration-200"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 8V4m0 0h4M4 4l5 5m11-5V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
                              />
                            </svg>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h1 
                          className={`text-3xl md:text-5xl font-bold ${
                            isOwner ? 'bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600' : ''
                          }`}
                        >
                          {`${decodeURIComponent(account_name)}${currentOG?.og_name}`}
                        </h1>
                        {isOwner && (
                          <div 
                            onClick={() => setShowProfileModal(true)}
                            className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 flex-shrink-0 cursor-pointer group/owner"
                            title="You own this account"
                          />
                        )}
                      </div>
                      {account.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                          {account.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {ensName && (
                  <div className="text-center py-2">
                    <p className="text-sm opacity-0 group-hover/main:opacity-70 transition-opacity duration-300 delay-300 text-gray-600 dark:text-gray-400">
                      {ensName}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-full">
              {account?.tba_address && (
                <TabbedModules 
                  address={account.tba_address} 
                  isTokenbound={true}
                  isOwner={isOwner}
                  initialModule={initialModule}
                  initialChain={initialChain}
                />
              )}
            </div>
          </div>

          <div className={`mt-4 transition-opacity duration-1000 ease-in-out ${showOnchainData ? 'opacity-100' : 'opacity-0'} px-4 lg:px-0`}>
            {showOnchainData && <AccountContractInfo token_id={account.token_id} />}
          </div>
        </div>
      </div>
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent 
          className="max-w-[80vh] max-h-[80vh] p-0 bg-black/95 border-gray-800"
          aria-describedby="account-image-fullscreen"
        >
          <DialogTitle className="sr-only">
            Account Image
          </DialogTitle>
          <div 
            className="relative w-full h-full flex items-center justify-center p-2"
            id="account-image-fullscreen"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <AccountImage 
                tokenId={account.token_id} 
                variant="square" 
                className="w-full h-full !rounded-lg"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Profile Settings Modal */}
      {isOwner && showProfileModal && (
        <EnsureModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          operation="profile"
          asset={{
            chain: 'base',
            contract_address: currentOG?.contract_address || '',
            token_id: account.token_id.toString(),
            name: `${decodeURIComponent(account_name)}${currentOG?.og_name}`,
            description: account.description || 'No description set',
            image_url: `${process.env.NEXT_PUBLIC_BLOB_URL}/${currentOG?.og_name?.replace('.', '')}/${account.token_id}.png`,
            collection: {
              name: currentOG?.og_name || ''
            }
          }}
          isTokenbound={true}
          address={account.tba_address || ''}
          onAction={async () => {
            return { hash: '', isCrossChain: false };
          }}
        />
      )}
    </div>
  );
}
