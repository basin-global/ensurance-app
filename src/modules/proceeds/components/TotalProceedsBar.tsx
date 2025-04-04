'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSplitMetadata } from '@0xsplits/splits-sdk-react';
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

export function TotalProceedsBar({ address, title, description, onClick }: TotalProceedsBarProps) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get split metadata if the address is a split contract
  const { splitMetadata } = useSplitMetadata(base.id, address);

  // Fetch recipient data
  useEffect(() => {
    const fetchRecipientType = async () => {
      try {
        const response = await fetch('/api/proceeds/recipients?address=' + address);
        if (!response.ok) throw new Error('Failed to fetch recipient type');
        const data = await response.json();
        
        // If it's a split and we have metadata, show all recipients
        if (data?.type === 'split' && splitMetadata?.recipients) {
          setRecipients(splitMetadata.recipients.map(r => ({
            address: r.recipient.address,
            type: 'account', // We'll determine nested types later
            percentage: r.percentAllocation
          })));
        } else if (data?.type) {
          // Otherwise show as single recipient with name if available
          setRecipients([{
            address,
            type: data.type,
            name: data.name,
            percentage: 100
          }]);
        } else {
          // Default to account type if no type found
          setRecipients([{
            address,
            type: 'account',
            percentage: 100
          }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipient data');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipientType();
  }, [address, splitMetadata]);

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

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: navigate to proceeds view
      router.push(`/proceeds?address=${address}`);
    }
  };

  if (loading) {
    return <div className="h-12 bg-gray-800 rounded-full animate-pulse" />;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  return (
    <div 
      className="flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity"
      onClick={handleClick}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-200">{title}</h3>}
          <p className="text-sm font-medium text-gray-400">
            {recipients.length} {recipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
          </p>
        </div>
        {description && <p className="text-sm text-gray-400">{description}</p>}
      </div>

      <div className="w-full h-12 rounded-full overflow-hidden bg-transparent">
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
                pointerEvents: 'none'
              }}
              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const recipient = recipients.find(r => r.address === payload[0].dataKey);
                  return (
                    <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                      <p className="text-gray-400 text-sm">
                        {recipient?.name || recipient?.type.charAt(0).toUpperCase() + recipient?.type.slice(1)}:{' '}
                        {recipient?.percentage}%
                      </p>
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