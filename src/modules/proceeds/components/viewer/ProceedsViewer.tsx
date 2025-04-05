'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState, MarkerType,
  Panel,
  BaseEdge,
  EdgeProps,
  getSmoothStepPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SplitsClient } from '@0xsplits/splits-sdk';
import { FlowNode } from './ProceedsNode';

// Custom edge component for fluid animation
function FluidEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 30
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#60A5FA',
          opacity: 0.6
        }}
      />
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          className="fill-gray-400 text-xs"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          {data.label}
        </text>
      )}
    </>
  );
}

interface FlowViewerProps {
  address: string;
  chainId: number;
}

// Styles for the flow container
const flowStyles = {
  backgroundColor: '#111827', // Match your dark theme
};

// Default viewport settings
const defaultViewport = { x: 0, y: 0, zoom: 1 };

// Node types configuration
const nodeTypes = { flowNode: FlowNode };
const edgeTypes = { fluid: FluidEdge };

// Flow configuration
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

export function FlowViewer({ address, chainId }: FlowViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize splits client
  const splitsClient = useMemo(() => new SplitsClient({
    chainId,
    includeEnsNames: false,
    apiConfig: {
      apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY
    }
  }).dataClient, [chainId]);

  // Calculate node position based on level and index
  const calculatePosition = (level: number, index: number, totalAtLevel: number) => {
    const radius = level * 300; // Distance from center increases with level
    const angleStep = (2 * Math.PI) / Math.max(totalAtLevel, 1);
    const angle = index * angleStep;
    
    // Add some random variation to prevent perfect circles
    const randomRadius = radius * (0.9 + Math.random() * 0.2);
    const randomAngle = angle + (Math.random() * 0.2 - 0.1);
    
    return {
      x: Math.cos(randomAngle) * randomRadius,
      y: Math.sin(randomAngle) * randomRadius
    };
  };

  // Process a split and its recipients
  const processSplit = useCallback(async (
    splitAddress: string,
    processedAddresses: Set<string> = new Set(),
    knownSplits: Map<string, any> = new Map(),
    level: number = 0,
    index: number = 0,
    totalAtLevel: number = 1
  ) => {
    const normalizedAddress = splitAddress.toLowerCase();
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Skip if we've seen this address before
    if (processedAddresses.has(normalizedAddress)) {
      return { nodes: newNodes, edges: newEdges };
    }

    try {
      // Use cached metadata if available
      let splitMetadata = knownSplits.get(normalizedAddress);
      if (!splitMetadata) {
        const response = await splitsClient.getSplitMetadata({
          chainId,
          splitAddress: normalizedAddress
        });
        splitMetadata = response;
        knownSplits.set(normalizedAddress, splitMetadata);
      }

      // Add this address to processed set immediately
      processedAddresses.add(normalizedAddress);

      // Calculate position
      const position = calculatePosition(level, index, totalAtLevel);

      // Add node
      newNodes.push({
        id: normalizedAddress,
        type: 'flowNode',
        data: {
          label: `${splitAddress.slice(0, 6)}...${splitAddress.slice(-4)}`,
          recipients: splitMetadata?.recipients || [],
          isSplit: Boolean(splitMetadata?.recipients?.length),
          isSource: level === 0
        },
        position,
        draggable: true // Ensure node is draggable
      });

      if (splitMetadata?.recipients) {
        // First, check all recipients in parallel to identify which ones are splits
        const recipientChecks = await Promise.all(
          splitMetadata.recipients.map(async (recipient) => {
            const recipientAddress = recipient.recipient.address.toLowerCase();
            
            // Skip if already processed or known
            if (processedAddresses.has(recipientAddress) || knownSplits.has(recipientAddress)) {
              return {
                address: recipientAddress,
                isSplit: true,
                percentage: recipient.percentAllocation
              };
            }

            try {
              const metadata = await splitsClient.getSplitMetadata({
                chainId,
                splitAddress: recipientAddress
              });
              knownSplits.set(recipientAddress, metadata);
              return {
                address: recipientAddress,
                isSplit: Boolean(metadata?.recipients?.length),
                percentage: recipient.percentAllocation
              };
            } catch (err) {
              return {
                address: recipientAddress,
                isSplit: false,
                percentage: recipient.percentAllocation
              };
            }
          })
        );

        // Filter split recipients and create edges
        const splitRecipients = recipientChecks.filter(r => r.isSplit);
        splitRecipients.forEach(({ address, percentage }) => {
          newEdges.push({
            id: `${normalizedAddress}-${address}`,
            source: normalizedAddress,
            target: address,
            sourceHandle: 'source',
            targetHandle: 'target',
            label: `${Math.round(percentage)}%`,
            type: 'fluid',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20
            },
            style: { stroke: '#64748b' }
          });
        });

        // Process new splits in parallel if not at max depth
        if (level < 3) {
          const childResults = await Promise.all(
            splitRecipients
              .filter(r => !processedAddresses.has(r.address))
              .map((r, idx) => 
                processSplit(
                  r.address, 
                  processedAddresses, 
                  knownSplits, 
                  level + 1,
                  idx,
                  splitRecipients.length
                )
              )
          );
          
          childResults.forEach(result => {
            newNodes.push(...result.nodes);
            newEdges.push(...result.edges);
          });
        }
      }

      return { nodes: newNodes, edges: newEdges };
    } catch (err) {
      console.warn(`Error processing split ${splitAddress}:`, err);
      if (!processedAddresses.has(normalizedAddress)) {
        const position = calculatePosition(level, index, totalAtLevel);
        newNodes.push({
          id: normalizedAddress,
          type: 'flowNode',
          data: {
            label: `${splitAddress.slice(0, 6)}...${splitAddress.slice(-4)}`,
            isSplit: false,
            recipients: []
          },
          position,
          draggable: true
        });
      }
      return { nodes: newNodes, edges: newEdges };
    }
  }, [chainId, splitsClient]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { nodes: newNodes, edges: newEdges } = await processSplit(
          address, 
          new Set(), 
          new Map()
        );
        
        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error('Error loading split data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load split data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [address, processSplit]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-900">
        <div className="text-gray-200">Loading split data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-900">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-8rem)] bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{ flowNode: FlowNode }}
        edgeTypes={{ fluid: FluidEdge }}
        defaultEdgeOptions={{
          type: 'fluid'
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={true}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={12} />
        <Controls />
        <MiniMap 
          nodeColor={n => n.data?.isSplit ? '#60A5FA' : '#64748B'}
          maskColor="rgba(0, 0, 0, 0.2)"
          className="bg-gray-800/50 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
} 