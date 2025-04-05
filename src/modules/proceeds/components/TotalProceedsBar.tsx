'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SplitsClient } from '@0xsplits/splits-sdk';
import { base } from 'viem/chains';
import { useRouter } from 'next/navigation';

interface Recipient {
  address: string;
  type: 'split' | 'stream' | 'swapper' | 'team' | 'account';
  name?: string;
  percentage: number;
}

interface TotalProceedsBarProps {
  address: string;
  title?: string;
  description?: string;
  onClick?: () => void;
}

const MAX_DEPTH = 3; // Maximum depth to traverse split relationships

export function TotalProceedsBar({ address, title, description, onClick }: TotalProceedsBarProps) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize splits client
  const splitsClient = useMemo(() => new SplitsClient({
    chainId: base.id,
    includeEnsNames: false,
    apiConfig: {
      apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY
    }
  }).dataClient, []);

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
          percentage: parentPercentage
        });
        return allRecipients;
      }

      // Process each recipient sequentially
      for (const recipient of splitMetadata.recipients) {
        const recipientAddress = recipient.recipient.address.toLowerCase();
        const adjustedPercentage = (recipient.percentAllocation * parentPercentage) / 100;

        if (!processedAddresses.has(recipientAddress) && depth < MAX_DEPTH) {
          // Recursively process this recipient
          await getAllRecipients(
            recipientAddress,
            adjustedPercentage,
            depth + 1,
            processedAddresses,
            allRecipients
          );
        } else {
          // Add as direct recipient if already seen or at max depth
          allRecipients.push({
            address: recipientAddress,
            type: 'account' as const,
            percentage: adjustedPercentage
          });
        }
      }

      return allRecipients;
    } catch (err: any) {
      // If not a split, add as single recipient
      if (err.message?.includes('No split found at address')) {
        allRecipients.push({
          address: normalizedAddress,
          type: 'account' as const,
          percentage: parentPercentage
        });
        return allRecipients;
      }
      console.warn(`Error processing split ${splitAddress} at depth ${depth}:`, err);
      return allRecipients;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchSplitsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all recipients recursively with a fresh processedAddresses set
        const allRecipients = await getAllRecipients(address, 100, 0, new Set());

        if (!isMounted) return;

        // Debug logging
        console.log(`[${title || address}] All recipients before combining:`, allRecipients.map(r => ({
          address: r.address.slice(-4),
          percentage: r.percentage.toFixed(2)
        })));

        // Combine duplicate recipients
        const combinedRecipients = allRecipients.reduce((acc, curr) => {
          const existing = acc.find(r => r.address === curr.address);
          if (existing) {
            console.log(`[${title || address}] Combining ${curr.address.slice(-4)}: ${existing.percentage.toFixed(2)}% + ${curr.percentage.toFixed(2)}%`);
            existing.percentage += curr.percentage;
          } else {
            acc.push({ ...curr });
          }
          return acc;
        }, [] as Recipient[]);

        // Debug logging
        console.log(`[${title || address}] Final combined recipients:`, combinedRecipients.map(r => ({
          address: r.address.slice(-4),
          percentage: r.percentage.toFixed(2)
        })));

        // Set final state
        setRecipients(combinedRecipients.length > 0 ? combinedRecipients : [{
          address,
          type: 'account' as const,
          percentage: 100
        }]);
      } catch (err) {
        console.error(`[${title || address}] Error fetching splits:`, err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load recipient data');
          setRecipients([{
            address,
            type: 'account' as const,
            percentage: 100
          }]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSplitsData();

    return () => {
      isMounted = false;
    };
  }, [address, splitsClient, title]);

  // Generate colors based on recipient type and index
  const colors = recipients.map((_, index) => {
    const hue = (index * 137.508) % 360;
    return `hsl(${hue}, 70%, 65%)`;
  });

  // Format data for the chart
  const data = [{
    name: "Allocations",
    ...recipients.reduce((acc, r) => ({
      ...acc,
      [r.address]: r.percentage / 100
    }), {})
  }];

  if (loading) {
    return <div className="h-12 bg-gray-800 rounded-full animate-pulse" />;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 group-hover:opacity-95 transition-all">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-200">{title}</h3>}
          <p className="text-sm font-medium text-gray-400">
            {recipients.length} {recipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
          </p>
        </div>
        {description && <p className="text-sm text-gray-400">{description}</p>}
      </div>

      <div className="w-full h-12 rounded-full overflow-hidden bg-transparent group-hover:ring-1 group-hover:ring-gray-500 transition-all">
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
            <Tooltip
              wrapperStyle={{ 
                zIndex: 9999,
                pointerEvents: 'none',
                cursor: 'inherit'
              }}
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const recipient = recipients.find(r => r.address === payload[0].dataKey);
                  const shortAddress = recipient?.address ? 
                    `...${recipient.address.slice(-4)}` : '';
                  return (
                    <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                      <span className="text-gray-400 text-sm">
                        {recipient?.type.charAt(0).toUpperCase() + recipient?.type.slice(1)} {shortAddress}:{' '}
                        {recipient?.percentage.toFixed(2)}%
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
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 