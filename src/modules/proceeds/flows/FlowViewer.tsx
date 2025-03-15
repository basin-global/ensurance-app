'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState, MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSplitMetadata, useSplitsClient } from '@0xsplits/splits-sdk-react';
import { FlowNode } from '../components/FlowNode';
import { SplitLevel } from '../components/SplitLevel';

interface FlowViewerProps {
  address: string;
  chainId: number;
}

const flowStyles = {
  background: '#111827',
  width: '100%',
  height: '80vh',
};

const defaultViewport = { x: 0, y: 0, zoom: 0.75 };
const nodeTypes = { flowNode: FlowNode };
const MAX_DEPTH = 10;

interface SplitRecipient {
  percentAllocation: number;
  recipient: {
    address: string;
    ens?: string;
  };
}

export function FlowViewer({ address, chainId }: FlowViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenAddresses] = useState(new Set<string>());

  // Get split metadata for level 0
  const { splitMetadata: initialSplitMetadata, error: splitError, isLoading } = useSplitMetadata(chainId, address);

  const handleSplitFound = useCallback((level: number, splitAddress: string, metadata: { recipients: SplitRecipient[] }) => {
    // Update nodes
    setNodes(currentNodes => {
      // Skip if we already have this node
      if (currentNodes.find(n => n.id === splitAddress)) return currentNodes;

      const newNode: Node = {
        id: splitAddress,
        type: 'flowNode',
        data: {
          label: `${splitAddress.slice(0, 6)}...${splitAddress.slice(-4)}`,
          recipients: metadata.recipients,
          isSplit: true,
          isSource: level === 0,
          isReoccurring: seenAddresses.has(splitAddress)
        },
        position: {
          x: 200 + (level * 300),
          y: level * 200
        }
      };

      seenAddresses.add(splitAddress);
      return [...currentNodes, newNode];
    });

    // Update edges
    setEdges(currentEdges => {
      const newEdges: Edge[] = [];
      
      metadata.recipients.forEach((recipient: SplitRecipient) => {
        const edgeId = `${splitAddress}-${recipient.recipient.address}`;
        if (!currentEdges.find(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: splitAddress,
            target: recipient.recipient.address,
            sourceHandle: 'source',
            targetHandle: 'target',
            label: `${Math.round(recipient.percentAllocation)}%`,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20
            },
            style: { stroke: '#64748b' }
          });
        }
      });

      return [...currentEdges, ...newEdges];
    });
  }, [seenAddresses, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-700 p-8 text-center text-gray-200">
        Loading split data...
      </div>
    );
  }

  if (splitError || !initialSplitMetadata) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-700 p-8 text-center text-red-500">
        {splitError?.message || 'No split found'}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700" style={{ height: '60vh' }}>
      <SplitLevel
        address={address}
        chainId={chainId}
        level={0}
        onSplitFound={handleSplitFound}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultViewport={defaultViewport}
        style={flowStyles}
        fitView
        fitViewOptions={{ 
          padding: 0.5,
          minZoom: 0.5,
          maxZoom: 1.5
        }}
        nodeTypes={nodeTypes}
      >
        <Background className="bg-gray-900" />
        <Controls className="bg-gray-800 text-gray-200 border border-gray-700" />
        <MiniMap className="bg-gray-800" />
      </ReactFlow>
    </div>
  );
} 