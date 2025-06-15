'use client';

import { useEffect, useState, Suspense } from 'react';
import { SplitsClient } from '@0xsplits/splits-sdk';
import { base } from 'viem/chains';
import { Copy } from 'lucide-react';
import Portfolio from '@/modules/account-modules/portfolio';

interface ContractPageProps {
  params: {
    contract: string;
  }
}

interface SplitData {
  recipients: {
    recipient: {
      address: string;
    };
    percentAllocation: number;
  }[];
}

interface AddressInfo {
  name: string;
  type: string;
  description?: string;
}

interface ProceedsData {
  split: any | null;
  stream: any | null;
  swapper: any | null;
  team: any | null;
}

// Add loading component
function LoadingState() {
  return (
    <div className="container mx-auto p-8">
      <div className="animate-pulse">
        <div className="h-8 w-64 bg-gray-700 rounded mb-4" />
        <div className="h-4 w-96 bg-gray-700 rounded mb-8" />
        <div className="h-12 bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

// Split the data fetching into a separate component
function ContractData({ contract }: { contract: string }) {
  const [splitData, setSplitData] = useState<SplitData | null>(null);
  const [proceedsData, setProceedsData] = useState<ProceedsData | null>(null);
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [recipientNames, setRecipientNames] = useState<Record<string, AddressInfo>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Handle copy address
  const handleCopy = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch proceeds data and names in parallel
        const [proceedsResponse, namesResponse] = await Promise.all([
          fetch(`/api/proceeds?address=${contract}`, {
            next: { revalidate: 60 } // Cache for 1 minute
          }),
          fetch('/api/proceeds', {
            next: { revalidate: 60 } // Cache for 1 minute
          })
        ]);

        if (!proceedsResponse.ok) {
          throw new Error('Failed to fetch proceeds data');
        }

        if (!namesResponse.ok) {
          console.error('Failed to fetch names:', namesResponse.status);
        }

        const proceedsData = await proceedsResponse.json();
        setProceedsData(proceedsData);

        // Only fetch split data if this is a split
        if (proceedsData.split) {
          const client = new SplitsClient({
            chainId: base.id,
            includeEnsNames: false,
            apiConfig: {
              apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY as string
            }
          }).dataClient;

          if (!client) {
            throw new Error('Failed to initialize Splits client');
          }

          const splitMetadata = await client.getSplitMetadata({
            chainId: base.id,
            splitAddress: contract
          });
          setSplitData(splitMetadata);
        }

        // Process names data
        const names = await namesResponse.json();
        // Set contract info
        const info = Object.entries(names).find(
          ([addr]) => addr.toLowerCase() === contract.toLowerCase()
        )?.[1] as AddressInfo;
        
        if (info) {
          setAddressInfo(info);
        }

        // Set recipient names
        const recipientInfo = Object.entries(names).reduce((acc, [addr, info]) => {
          acc[addr.toLowerCase()] = info as AddressInfo;
          return acc;
        }, {} as Record<string, AddressInfo>);
        setRecipientNames(recipientInfo);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    };

    fetchData();
  }, [contract]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  // If no data found for any type
  if (!proceedsData?.split && !proceedsData?.stream && !proceedsData?.swapper && !proceedsData?.team) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-gray-300">
          No proceeds data found for address {contract} on chain {base.id}. Please confirm you have entered the correct address.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Contract Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-100">
            {addressInfo?.name || 'Proceeds Contract'}
          </h1>
          {addressInfo?.description && (
            <p className="text-gray-300 text-lg">
              {addressInfo.description}
            </p>
          )}
        </div>
        
        <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg">
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <span>{contract}</span>
            <button
              onClick={() => handleCopy(contract)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Copy address"
            >
              <Copy 
                size={14} 
                className={copiedAddress === contract ? 'text-green-400' : 'text-gray-400'}
              />
            </button>
          </p>
          {addressInfo?.type && (
            <span className="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300">
              {addressInfo.type}
            </span>
          )}
        </div>
      </div>

      {/* Split Data */}
      {splitData && (
        <div className="space-y-6">
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-200 mb-4">recipients</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-3 px-4 w-[40%]">name/address</th>
                    <th className="text-right py-3 px-4 w-[20%]">allocation</th>
                    <th className="text-left py-3 px-4 w-[20%]">type</th>
                    <th className="text-right py-3 px-4 w-[20%]">actions</th>
                  </tr>
                </thead>
                <tbody>
                  {splitData.recipients.map((recipient, index) => {
                    const address = recipient.recipient.address;
                    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                    const hue = (index * 137.508) % 360;
                    const recipientInfo = recipientNames[address.toLowerCase()];
                    const recipientType = recipientInfo?.type || 'account';

                    return (
                      <tr key={address} className="border-b border-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `hsl(${hue}, 70%, 60%)` }}
                            />
                            <div className="flex flex-col">
                              {recipientInfo?.name ? (
                                <span className="text-gray-200">{recipientInfo.name}</span>
                              ) : (
                                <span className="text-gray-400 font-mono">{shortAddress}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-300">
                          {recipient.percentAllocation}%
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-400">
                            {recipientType}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <a
                            href={`https://app.splits.org/accounts/${address}/?chainId=8453`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            View on Splits
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stream Data */}
      {proceedsData.stream && (
        <div className="space-y-6">
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-200 mb-4">stream details</h3>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <pre className="text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(proceedsData.stream, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Swapper Data */}
      {proceedsData.swapper && (
        <div className="space-y-6">
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-200 mb-4">swapper details</h3>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <pre className="text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(proceedsData.swapper, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Team Data */}
      {proceedsData.team && (
        <div className="mt-8">
          <Portfolio tbaAddress={contract} />
        </div>
      )}
    </div>
  );
}

export default function ContractPage({ params }: ContractPageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ContractData contract={params.contract} />
    </Suspense>
  );
}
