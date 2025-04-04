'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { useSplitMetadata } from '@0xsplits/splits-sdk-react';
import { base } from 'viem/chains';

interface ProceedsRecipient {
  percentAllocation: number;
  recipient: {
    address: string;
    ens?: string;
  };
}

interface ProceedsBarProps {
  recipients: ProceedsRecipient[];
  isFlowView?: boolean;
}

export function ProceedsBar({ recipients, isFlowView = false }: ProceedsBarProps) {
  // Get split metadata if the address is a split contract
  const { splitMetadata } = useSplitMetadata(
    base.id, 
    recipients[0]?.recipient.address
  );

  // Use split metadata if available, otherwise use passed recipients
  const displayRecipients = useMemo(() => {
    if (splitMetadata?.recipients) {
      return splitMetadata.recipients;
    }
    return recipients;
  }, [splitMetadata, recipients]);

  const data = useMemo(() => {
    return [{
      name: "Allocations",
      ...displayRecipients.reduce((acc, recipient) => ({
        ...acc,
        [recipient.recipient.address]: recipient.percentAllocation / 100
      }), {})
    }];
  }, [displayRecipients]);

  const colors = useMemo(() => {
    return displayRecipients.map((_, index) => {
      const hue = (index * 137.508) % 360;
      const saturation = '70%';
      const lightness = '65%';
      return `hsl(${hue}, ${saturation}, ${lightness})`;
    });
  }, [displayRecipients]);

  return (
    <div className={`flex flex-col gap-2 ${!isFlowView && 'cursor-pointer hover:opacity-90 transition-opacity'}`}>
      {!isFlowView && (
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          {displayRecipients.length} {displayRecipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
          <span className="text-xs text-gray-500">(click to view)</span>
        </h3>
      )}
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
              content={({ active }) => {
                if (active) {
                  return (
                    <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                      <p className="text-gray-400 text-sm">
                        {displayRecipients.length} {displayRecipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {displayRecipients.map((recipient, index) => (
              <Bar
                key={recipient.recipient.address}
                dataKey={recipient.recipient.address}
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