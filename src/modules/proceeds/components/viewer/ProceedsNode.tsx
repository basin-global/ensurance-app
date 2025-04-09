'use client';

import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

interface FlowNodeProps {
  data: {
    label: string;
    fullAddress: string;
    recipients?: {
      percentAllocation: number;
      recipient: {
        address: string;
        ens?: string;
      };
    }[];
    isSplit: boolean;
    isSource?: boolean;
    isReoccurring?: boolean;
  };
}

export function FlowNode({ data }: FlowNodeProps) {
  // Generate colors for recipients
  const colors = data.recipients?.map((_, index) => {
    const hue = (index * 137.508) % 360;
    return `hsl(${hue}, 70%, 65%)`;
  }) || [];

  // Format address for display
  const shortAddress = `${data.fullAddress.slice(0, 6)}...${data.fullAddress.slice(-4)}`;
  const isNamedAddress = data.label !== shortAddress;

  return (
    <div className={`
      relative p-4
      rounded-xl
      w-[240px]
      flex flex-col items-center
      ${data.isSource 
        ? 'ring-2 ring-yellow-500 ring-opacity-50'
        : ''
      }
      ${data.isSplit 
        ? 'bg-gray-800/80 backdrop-blur-sm' 
        : 'bg-gray-700/80 backdrop-blur-sm'
      }
      transition-all duration-300 ease-in-out
      group
    `}>
      {/* Top handle with glow effect */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-blue-500/80 !border-2 !border-blue-300/30"
        style={{ top: '-6px' }}
      />
      
      <div className="flex flex-col items-center w-full gap-3">
        {/* Status indicator */}
        {data.isReoccurring && (
          <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-green-500" />
        )}

        {/* Address and name labels */}
        <div className="flex flex-col items-center gap-1">
          {isNamedAddress && (
            <div className="text-gray-200 font-medium text-sm text-center">
              {data.label}
            </div>
          )}
          <div className="text-gray-400 font-mono text-xs text-center">
            {shortAddress}
          </div>
        </div>
        
        {/* Recipients bar */}
        {data.isSplit && data.recipients && data.recipients.length > 0 && (
          <div className="w-full h-8 rounded-lg overflow-hidden bg-gray-900/50 flex">
            {data.recipients.map((recipient, index) => {
              const percentage = Math.max(0, Math.min(100, recipient.percentAllocation || 0));
              return (
                <div
                  key={recipient.recipient.address}
                  className="h-full transition-all duration-300"
                  style={{
                    backgroundColor: colors[index],
                    width: `${percentage}%`,
                  }}
                  title={`${recipient.recipient.address} (${percentage}%)`}
                />
              );
            })}
          </div>
        )}

        {/* Show single bar for non-split nodes */}
        {!data.isSplit && (
          <div className="w-full h-8 rounded-lg overflow-hidden bg-gray-900/50">
            <div className="w-full h-full bg-gray-600" />
          </div>
        )}
      </div>

      {/* Bottom handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-blue-500/80 !border-2 !border-blue-300/30"
        style={{ bottom: '-6px' }}
      />

      {/* Static ring */}
      <div className="
        absolute inset-0 rounded-xl
        ring-2 ring-blue-500/20
        group-hover:ring-blue-500/30
        transition-all duration-300
      "/>
    </div>
  );
} 