'use client';

import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { ProceedsBubbles } from './ProceedsBubbles';

interface FlowNodeProps {
  data: {
    label: string;
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
  // Determine node type
  const nodeType = data.isSplit 
    ? (data.recipients?.length === 1 ? 'single-split' : 'multi-split')
    : 'account';

  return (
    <div className={`
      relative p-4
      rounded-full
      w-[240px] aspect-square
      flex flex-col items-center justify-center
      ${data.isSource 
        ? 'ring-2 ring-yellow-500 ring-opacity-50'
        : ''
      }
      ${nodeType === 'account' 
        ? 'bg-gray-700/80 backdrop-blur-sm' 
        : 'bg-gray-800/80 backdrop-blur-sm'
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
      
      <div className="flex flex-col items-center w-full h-full">
        {/* Status indicator */}
        {data.isReoccurring && (
          <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-green-500" />
        )}

        {/* Address label */}
        <div className="text-gray-200 font-mono text-sm text-center break-all px-2">
          {data.label}
        </div>
        
        {/* Show ProceedsBubbles only for splits */}
        {data.isSplit && data.recipients && (
          <div className="w-full h-full flex-1">
            <ProceedsBubbles 
              recipients={data.recipients} 
              isFlowView={true}
            />
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
        absolute inset-0 rounded-full
        ring-2 ring-blue-500/20
        group-hover:ring-blue-500/30
        transition-all duration-300
      "/>
    </div>
  );
} 