'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { SplitsClient } from '@0xsplits/splits-sdk';
import { base } from 'viem/chains';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface Recipient {
  address: string;
  type: 'split' | 'stream' | 'swapper' | 'team' | 'account';
  name?: string;
  percentage: number;  // For bar chart
  isDirect: boolean;
  directPercentage?: number;  // For direct list
}

// Add interface for proceeds data
interface ProceedsData {
  name: string | null;
  type: string;
  description: string | null;
}

// Add interface for account data
interface AccountData {
  full_account_name: string | null;
  group_name: string;
}

interface TotalProceedsBarProps {
  address: string;
  onRecipientsUpdate?: (counts: { direct: number; indirect: number }) => void;
}

const MAX_DEPTH = 3; // Maximum depth to traverse split relationships

// Initialize splits client
const splitsClient = new SplitsClient({
  chainId: base.id,
  includeEnsNames: false,
  apiConfig: {
    apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY || ''
  }
}).dataClient as any;

// Helper function to get all recipients recursively
const getAllRecipients = async (
  splitAddress: string,
  parentPercentage: number = 100,
  depth: number = 0,
  processedAddresses: Set<string> = new Set(),
  allRecipients: Recipient[] = []
): Promise<Recipient[]> => {
  const normalizedAddress = splitAddress.toLowerCase();
  
  // If we've seen this address before or hit max depth, stop recursion
  if (processedAddresses.has(normalizedAddress) || depth >= MAX_DEPTH) {
    return allRecipients;
  }

  // Track that we've processed this address
  processedAddresses.add(normalizedAddress);
  
  try {
    const splitMetadata = await splitsClient.getSplitMetadata({
      chainId: base.id,
      splitAddress
    });

    // If not a split or no recipients, add as single recipient
    if (!splitMetadata?.recipients?.length) {
      allRecipients.push({
        address: normalizedAddress,
        type: 'account' as const,
        percentage: parentPercentage,
        isDirect: depth === 0,  // Only direct if at root level
        directPercentage: depth === 0 ? 100 : undefined
      });
      return allRecipients;
    }

    // Always add the split address itself (not just leaves)
    allRecipients.push({
      address: normalizedAddress,
      type: 'split' as const,
      percentage: parentPercentage,
      isDirect: depth === 0,  // Only direct if at root level
      directPercentage: depth === 0 ? 100 : undefined
    });

    // Process each recipient sequentially
    for (const recipient of splitMetadata.recipients) {
      const recipientAddress = recipient.recipient.address.toLowerCase();
      const adjustedPercentage = (recipient.percentAllocation * parentPercentage) / 100;

      // Only add as direct recipient if we're at the root level
      if (depth === 0) {
        allRecipients.push({
          address: recipientAddress,
          type: 'account' as const,
          percentage: adjustedPercentage,
          isDirect: true,
          directPercentage: recipient.percentAllocation
        });
      }

      if (!processedAddresses.has(recipientAddress) && depth < MAX_DEPTH) {
        // Recursively process this recipient for indirect recipients
        const indirectRecipients = await getAllRecipients(
          recipientAddress,
          adjustedPercentage,
          depth + 1,
          processedAddresses,
          []
        );
        // Add all indirect recipients
        allRecipients.push(...indirectRecipients);
      }
    }

    return allRecipients;
  } catch (err: any) {
    // If not a split, add as single recipient
    if (err.message?.includes('No split found at address')) {
      allRecipients.push({
        address: normalizedAddress,
        type: 'account' as const,
        percentage: parentPercentage,
        isDirect: depth === 0,  // Only direct if at root level
        directPercentage: depth === 0 ? 100 : undefined
      });
      return allRecipients;
    }
    console.warn(`Error processing split ${splitAddress} at depth ${depth}:`, err);
    return allRecipients;
  }
};

// Helper function to combine recipients
const combineRecipients = (recipients: Recipient[]): Recipient[] => {
  return recipients.reduce((acc: Recipient[], curr) => {
    const existing = acc.find(r => r.address === curr.address);
    if (existing) {
      existing.percentage += curr.percentage;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, []);
};

// Add helper function for truncating addresses
const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function TotalProceedsBar({ address, onRecipientsUpdate }: TotalProceedsBarProps) {
  const router = useRouter();
  const [loadingAddress, setLoadingAddress] = useState<string | null>(null);

  // Add query for proceeds data
  const { data: proceedsData = {} } = useQuery<Record<string, ProceedsData>>({
    queryKey: ['proceeds-data'],
    queryFn: async () => {
      const response = await fetch('/api/proceeds');
      if (!response.ok) throw new Error('Failed to fetch proceeds data');
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add query for account data
  const { data: accountData = {} } = useQuery<Record<string, AccountData>>({
    queryKey: ['account-data'],
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch account data');
      const accounts = await response.json();
      // Convert array to map for easy lookup
      return accounts.reduce((acc: Record<string, AccountData>, account: any) => {
        if (account.tba_address) {
          acc[account.tba_address.toLowerCase()] = {
            full_account_name: account.full_account_name,
            group_name: account.group_name
          };
        }
        return acc;
      }, {});
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use React Query to fetch and cache split data
  const { data: recipients = [], isLoading, error } = useQuery<Recipient[]>({
    queryKey: ['split-data', address],
    queryFn: async () => {
      if (!splitsClient) {
        throw new Error('Splits client not initialized');
      }

      // Get all recipients recursively with a fresh processedAddresses set
      const allRecipients = await getAllRecipients(address, 100, 0, new Set());

      // Debug logging
      console.log(`[${address}] All recipients before combining:`, allRecipients.map(r => ({
        address: r.address.slice(-4),
        percentage: r.percentage.toFixed(2),
        isDirect: r.isDirect
      })));

      // Combine duplicate recipients, preserving direct/indirect status
      const combinedRecipients = allRecipients.reduce((acc: Recipient[], curr) => {
        const existing = acc.find(r => r.address === curr.address);
        if (existing) {
          existing.percentage += curr.percentage;
          // Keep isDirect true if either is direct
          existing.isDirect = existing.isDirect || curr.isDirect;
          // Keep directPercentage if it exists
          existing.directPercentage = existing.directPercentage || curr.directPercentage;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, []);

      // Debug logging
      console.log(`[${address}] Final combined recipients:`, combinedRecipients.map(r => ({
        address: r.address.slice(-4),
        percentage: r.percentage.toFixed(2),
        isDirect: r.isDirect
      })));

      return combinedRecipients.length > 0 ? combinedRecipients : [{
        address,
        type: 'account' as const,
        percentage: 100,
        isDirect: true,
        directPercentage: 100
      }];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Remove the separate direct recipients query since we now handle it in the main query
  const directRecipients = useMemo(() => 
    recipients.filter(r => r.isDirect && r.address.toLowerCase() !== address.toLowerCase()),
    [recipients, address]
  );

  const indirectRecipients = useMemo(() => 
    recipients.filter(r => !r.isDirect),
    [recipients]
  );

  // Generate colors based on recipient type and index
  const colors = useMemo(() => 
    recipients.map((_, index: number) => {
      const hue = (index * 137.508) % 360;
      return `hsl(${hue}, 70%, 65%)`;
    }), [recipients]);

  // Format data for the charts
  const data = useMemo(() => [{
    name: "Allocations",
    ...recipients.reduce((acc: Record<string, number>, r) => ({
      ...acc,
      [r.address]: r.percentage / 100
    }), {})
  }], [recipients]);

  const directData = useMemo(() => [{
    name: "Direct Allocations",
    ...directRecipients.reduce((acc: Record<string, number>, r: Recipient) => ({
      ...acc,
      [r.address]: r.directPercentage ? r.directPercentage / 100 : 0
    }), {})
  }], [directRecipients]);

  // Update parent component with recipient counts
  useEffect(() => {
    if (onRecipientsUpdate) {
      onRecipientsUpdate({
        direct: directRecipients.length,
        indirect: indirectRecipients.length
      });
    }
  }, [directRecipients.length, indirectRecipients.length, onRecipientsUpdate]);

  // Helper function to get display name
  const getDisplayName = (address: string) => {
    const normalizedAddress = address.toLowerCase();
    const displayName = proceedsData[normalizedAddress]?.name || 
                       accountData[normalizedAddress]?.full_account_name || 
                       truncateAddress(address);
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setLoadingAddress(normalizedAddress);
      router.push(proceedsData[normalizedAddress] ? 
        `/proceeds/${normalizedAddress}` : 
        `/${accountData[normalizedAddress]?.full_account_name || normalizedAddress}`
      );
    };
    
    return (
      <Link 
        href={proceedsData[normalizedAddress] ? 
          `/proceeds/${normalizedAddress}` : 
          `/${accountData[normalizedAddress]?.full_account_name || normalizedAddress}`
        }
        onClick={handleClick}
        className={`text-gray-400 hover:text-gray-200 transition-colors ${loadingAddress === normalizedAddress ? 'opacity-50' : ''}`}
      >
        {displayName}
      </Link>
    );
  };

  if (isLoading) {
    return <div className="h-12 bg-gray-800 rounded-full animate-pulse" />;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error instanceof Error ? error.message : 'Failed to load recipient data'}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Recipient Lists */}
      <div className="space-y-4">
        {/* Direct Recipients with Percentages */}
        {directRecipients.length > 0 && (
          <div className="space-y-2 group/main">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-300">direct recipients ({directRecipients.length})</h4>
                <div 
                  className="cursor-pointer text-sm font-mono text-gray-500 opacity-0 group-hover/main:opacity-70 transition-opacity duration-300 delay-300 hover:text-gray-300"
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                      .then(() => toast.success('Split address copied to clipboard!', {
                        autoClose: 2000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                      }))
                      .catch(() => toast.error('Failed to copy address'))
                  }}
                >
                  {address}
                </div>
              </div>
            </div>
            
            {/* Direct Bar Chart */}
            <div 
              className="w-full h-12 rounded-full overflow-hidden bg-transparent hover:ring-1 hover:ring-gray-500 transition-all cursor-[pointer] hover:opacity-90"
              onClick={() => router.push('/proceeds')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={directData}
                  stackOffset="expand"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  barSize={24}
                >
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" hide />
                  <RechartsTooltip
                    wrapperStyle={{ 
                      zIndex: 9999,
                      pointerEvents: 'none',
                      cursor: 'pointer'
                    }}
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                            <span className="text-gray-400 text-sm">
                              view ensurance proceeds
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {directRecipients.map((recipient, index) => (
                    <Bar
                      key={recipient.address}
                      dataKey={recipient.address}
                      stackId="a"
                      fill={colors[index]}
                      radius={0}
                      className="cursor-pointer hover:opacity-90"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1">
              {directRecipients
                .sort((a, b) => (b.directPercentage || 0) - (a.directPercentage || 0))
                .map((r) => (
                <div key={r.address} className="flex justify-between items-center text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono">
                          {getDisplayName(r.address)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-mono">{truncateAddress(r.address)}</p>
                        {proceedsData[r.address]?.description && (
                          <p className="text-xs text-gray-400 mt-1">{proceedsData[r.address].description}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-gray-300">{r.directPercentage?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indirect Recipients Section */}
        {indirectRecipients.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">indirect recipients ({indirectRecipients.length})</h4>
            </div>
            
            {/* Bar Chart */}
            <div 
              className="w-full h-12 rounded-full overflow-hidden bg-transparent hover:ring-1 hover:ring-gray-500 transition-all cursor-[pointer] hover:opacity-90"
              onClick={() => router.push('/proceeds')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data}
                  stackOffset="expand"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  barSize={24}
                >
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" hide />
                  <RechartsTooltip
                    wrapperStyle={{ 
                      zIndex: 9999,
                      pointerEvents: 'none',
                      cursor: 'pointer'
                    }}
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                            <span className="text-gray-400 text-sm">
                              view ensurance proceeds
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {recipients.map((recipient, index) => (
                    <Bar
                      key={recipient.address}
                      dataKey={recipient.address}
                      stackId="a"
                      fill={colors[index]}
                      radius={0}
                      className="cursor-pointer hover:opacity-90"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {indirectRecipients.map((r) => (
                <div key={r.address} className="text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono">
                          {getDisplayName(r.address)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-mono">{truncateAddress(r.address)}</p>
                        {proceedsData[r.address]?.description && (
                          <p className="text-xs text-gray-400 mt-1">{proceedsData[r.address].description}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 