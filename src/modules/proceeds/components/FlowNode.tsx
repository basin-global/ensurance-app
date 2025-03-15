'use client';

import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { SplitsBar } from './SplitsBar';

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
      ${data.isSource 
        ? 'border-2 border-yellow-500'
        : 'border border-gray-700'
      }
      ${nodeType === 'account' 
        ? 'bg-gray-700 rounded-full border-gray-600 min-w-[200px]' 
        : nodeType === 'single-split'
          ? 'bg-gray-800 rounded-lg border-blue-700 min-w-[300px]'
          : 'bg-gray-800 rounded-lg min-w-[300px]'
      }
    `}>
      {/* Always show handles for all nodes */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="bg-blue-500" 
        id="target"
      />
      
      <div className="flex items-center gap-2">
        {data.isReoccurring && (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
        <div className={`
          text-gray-200 font-mono mb-2
          ${nodeType === 'account' ? 'text-center' : ''}
        `}>
          {data.label}
        </div>
      </div>
      
      {/* Show SplitsBar only for splits */}
      {data.isSplit && data.recipients && (
        <div className="mb-2">
          <SplitsBar 
            recipients={data.recipients} 
            isFlowView={true}
          />
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="bg-blue-500" 
        id="source"
      />
    </div>
  );
} 