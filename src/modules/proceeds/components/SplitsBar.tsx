'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface Recipient {
  percentAllocation: number;
  recipient: {
    address: string;
    ens?: string;
  };
}

interface SplitsBarProps {
  recipients: Recipient[];
  isFlowView?: boolean;
}

export function SplitsBar({ recipients, isFlowView = false }: SplitsBarProps) {
  const TOOLTIP_THRESHOLD = 20;

  const data = useMemo(() => {
    return [{
      name: "Allocations",
      ...recipients.reduce((acc, recipient) => ({
        ...acc,
        [recipient.recipient.address]: recipient.percentAllocation / 100
      }), {})
    }];
  }, [recipients]);

  const colors = useMemo(() => {
    return recipients.map((_, index) => {
      const hue = (index * 137.508) % 360;
      const saturation = '70%';
      const lightness = '65%';
      return `hsl(${hue}, ${saturation}, ${lightness})`;
    });
  }, [recipients]);

  return (
    <div className={`flex flex-col gap-2 ${!isFlowView && 'cursor-pointer hover:opacity-90 transition-opacity'}`}>
      {!isFlowView && (
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          {recipients.length} {recipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
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
                        {recipients.length} {recipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {recipients.map((recipient, index) => (
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