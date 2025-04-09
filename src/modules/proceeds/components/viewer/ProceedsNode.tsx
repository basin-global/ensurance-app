'use client';

import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useRouter } from 'next/navigation';

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
    percentage?: string;
  };
}

export function FlowNode({ data }: FlowNodeProps) {
  const router = useRouter();
  // Bright, visible colors only
  const colors = [
    '#60A5FA', // blue-400
    '#4ADE80', // green-400
    '#F472B6', // pink-400
    '#FBBF24', // amber-400
    '#A78BFA', // violet-400
    '#FB923C', // orange-400
    '#67E8F9', // cyan-400
    '#FCA5A5', // red-300
    '#C084FC', // purple-400
    '#86EFAC', // green-300
  ];

  // Format address for display
  const shortAddress = `${data.fullAddress.slice(0, 6)}...${data.fullAddress.slice(-4)}`;
  const isNamedAddress = data.label !== shortAddress;

  console.log('Rendering node:', {
    address: data.fullAddress,
    percentage: data.percentage,
    isSource: data.isSource
  });

  return (
    <div 
      className={`
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
            <div className="text-gray-200 font-medium text-sm text-center flex items-center gap-2">
              {data.label}
              {!data.isSource && data.percentage && (
                <span className="text-blue-300">({Math.round(parseFloat(data.percentage))}%)</span>
              )}
            </div>
          )}
          <a 
            href={`/proceeds/${data.fullAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 font-mono text-xs text-center hover:text-blue-300 transition-colors relative z-50 cursor-pointer px-2 py-1 hover:bg-gray-700/50 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            {shortAddress}
          </a>
        </div>
        
        {/* Recipients bar */}
        {data.isSplit && data.recipients && data.recipients.length > 0 && (
          <div className="w-full h-8 rounded-lg overflow-hidden bg-gray-900/50 flex">
            {data.recipients.map((recipient, index) => {
              const percentage = Math.max(0, Math.min(100, recipient.percentAllocation || 0));
              const colorIndex = index % colors.length;
              return (
                <div
                  key={recipient.recipient.address}
                  className="h-full transition-all duration-300"
                  style={{
                    backgroundColor: colors[colorIndex],
                    width: `${percentage}%`,
                    opacity: 0.9 // Slightly reduce opacity for better blending
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
            <div className="w-full h-full bg-blue-400/70" />
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