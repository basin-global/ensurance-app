'use client';

import { useEffect, useState } from 'react';
import { SplitsClient } from '@0xsplits/splits-sdk';
import { base } from 'viem/chains';
import { Copy } from 'lucide-react';

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

export default function ContractPage({ params }: ContractPageProps) {
  const [splitData, setSplitData] = useState<SplitData | null>(null);
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [recipientNames, setRecipientNames] = useState<Record<string, AddressInfo>>({});
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
        
        // Fetch split data
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

        const [splitMetadata, namesResponse] = await Promise.all([
          client.getSplitMetadata({
            chainId: base.id,
            splitAddress: params.contract
          }),
          fetch('/api/proceeds')
        ]);

        if (!namesResponse.ok) {
          console.error('Failed to fetch names:', namesResponse.status);
        } else {
          const names = await namesResponse.json();
          // Set contract info
          const info = Object.entries(names).find(
            ([addr]) => addr.toLowerCase() === params.contract.toLowerCase()
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
        }

        setSplitData(splitMetadata);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.contract]);

  if (loading) {
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

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Contract Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-100">
            {addressInfo?.name || 'Split Contract'}
          </h1>
          {addressInfo?.description && (
            <p className="text-gray-300 text-lg">
              {addressInfo.description}
            </p>
          )}
        </div>
        
        <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg">
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <span>{params.contract}</span>
            <button
              onClick={() => handleCopy(params.contract)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Copy address"
            >
              <Copy 
                size={14} 
                className={copiedAddress === params.contract ? 'text-green-400' : 'text-gray-400'}
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

      {/* Split Bar */}
      {splitData && splitData.recipients && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-200">
            ensurance proceeds
          </h2>
          <div className="w-full h-12 rounded-lg overflow-hidden bg-gray-800 flex">
            {splitData.recipients.map((recipient, index) => {
              const percentage = Math.max(0, Math.min(100, recipient.percentAllocation || 0));
              const hue = (index * 137.508) % 360; // Golden ratio for color spacing
              return (
                <div
                  key={recipient.recipient.address}
                  className="h-full transition-all duration-300 relative group"
                  style={{
                    backgroundColor: `hsl(${hue}, 70%, 65%)`,
                    width: `${percentage}%`,
                  }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 px-3 py-1.5 rounded text-sm whitespace-nowrap">
                    <span className="font-mono text-gray-300">
                      {recipient.recipient.address.slice(0, 6)}...{recipient.recipient.address.slice(-4)}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recipients Table */}
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
                      <tr 
                        key={address} 
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: `hsl(${hue}, 70%, 65%)` }}
                            />
                            <div className="flex items-center justify-between w-full">
                              {recipientInfo?.name ? (
                                <span className="text-gray-200">
                                  {recipientInfo.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-400">
                                  {shortAddress}
                                </span>
                                <button
                                  onClick={() => handleCopy(address)}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                  title="Copy address"
                                >
                                  <Copy 
                                    size={14} 
                                    className={copiedAddress === address ? 'text-green-400' : 'text-gray-400'}
                                  />
                                </button>
                              </div>
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
    </div>
  );
}
