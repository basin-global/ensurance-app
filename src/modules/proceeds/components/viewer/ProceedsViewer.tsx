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
  // Calculate control points for a natural curve
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Calculate horizontal distance for determining curve intensity
  const horizontalDistance = Math.abs(targetX - sourceX);
  const verticalDistance = Math.abs(targetY - sourceY);
  
  // Determine if this is an upward flow (return flow)
  const isUpwardFlow = targetY < sourceY;
  
  let edgePath;
  
  if (data?.isReturnFlow) {
    // Return flows take a wide path around the outside
    const curveIntensity = Math.max(horizontalDistance, 400); // Minimum curve width
    const sign = targetX > sourceX ? 1 : -1; // Determine which side to curve towards
    
    // Create a wide curve that goes around the outside
    edgePath = `M ${sourceX} ${sourceY}
                C ${sourceX + (sign * curveIntensity)} ${sourceY},
                  ${targetX + (sign * curveIntensity)} ${targetY},
                  ${targetX} ${targetY}`;
  } else {
    // Main flows stay more central with gentle curves
    const variance = Math.min(verticalDistance * 0.2, 100);
    
    edgePath = `M ${sourceX} ${sourceY}
                C ${sourceX} ${midY - variance},
                  ${targetX} ${midY + variance},
                  ${targetX} ${targetY}`;
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: data?.isReturnFlow ? 1.5 : 3, // Thicker main flow lines (3px), return lines stay thin
          opacity: data?.isReturnFlow ? 0.4 : 0.75,   // More opacity difference between return and main flows
          strokeDasharray: data?.isReturnFlow ? '4 4' : '8 4',
          filter: data?.isReturnFlow 
            ? 'drop-shadow(0 0 1px rgba(147, 197, 253, 0.2))' // Lighter shadow for return flows
            : 'drop-shadow(0 0 3px rgba(96, 165, 250, 0.4))'  // Stronger shadow for main flows
        }}
      />
      {data?.label && (
        <text
          x={midX}
          y={midY}
          className={`text-xs ${data?.isReturnFlow ? 'fill-blue-200' : 'fill-gray-300'}`}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.3))'
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

// Flow configuration
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

interface AddressInfo {
  name: string | null;
  type: string;
  description?: string;
  specific_asset_id?: number;
}

export function FlowViewer({ address, chainId }: FlowViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressNames, setAddressNames] = useState<Record<string, AddressInfo>>({});

  // Memoize node types and edge types
  const nodeTypes = useMemo(() => ({ flowNode: FlowNode }), []);
  const edgeTypes = useMemo(() => ({ fluid: FluidEdge }), []);

  // Initialize splits client with rate limiting
  const splitsClient = useMemo(() => {
    const client = new SplitsClient({
      chainId,
      includeEnsNames: false,
      apiConfig: {
        apiKey: process.env.NEXT_PUBLIC_SPLITS_API_KEY ?? ''
      }
    }).dataClient!;

    // Add delay between requests to avoid rate limiting
    const originalGetSplitMetadata = client.getSplitMetadata.bind(client);
    client.getSplitMetadata = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      return originalGetSplitMetadata(...args);
    };

    return client;
  }, [chainId]);

  // Fetch all address names upfront
  useEffect(() => {
    const fetchAddressNames = async () => {
      try {
        const response = await fetch('/api/proceeds');
        if (!response.ok) {
          console.error('Failed to fetch names:', response.status, response.statusText);
          return;
        }
        const names = await response.json();
        console.log('API Response:', {
          status: response.status,
          names,
          exampleKey: Object.keys(names)[0],
          exampleValue: names[Object.keys(names)[0]]
        });
        setAddressNames(names);
      } catch (err) {
        console.error('Failed to fetch address names:', err);
      }
    };

    fetchAddressNames();
  }, []);

  // Calculate node position based on level and index
  const calculatePosition = (level: number, index: number, totalAtLevel: number) => {
    // Base spacing configuration - increased spacing
    const VERTICAL_SPACING = 350;  // Increased from 250
    const HORIZONTAL_SPACING = 400; // Increased from 300
    const HORIZONTAL_OFFSET = 200;  // Increased from 150
    
    // Calculate base position
    const y = level * VERTICAL_SPACING;
    
    // Calculate x position with cascade effect
    let x;
    if (totalAtLevel === 1) {
      // Single node centered with level offset
      x = level * HORIZONTAL_OFFSET;
    } else {
      // Multiple nodes spread out with level offset
      const spread = (totalAtLevel - 1) * HORIZONTAL_SPACING;
      const startX = -(spread / 2) + (level * HORIZONTAL_OFFSET);
      x = startX + (index * HORIZONTAL_SPACING);
    }
    
    // Reduced random variation
    const randomX = x + (Math.random() * 20 - 10); // Reduced from 40
    const randomY = y + (Math.random() * 20 - 10); // Reduced from 40
    
    return {
      x: randomX,
      y: randomY
    };
  };

  // Process a split and its recipients
  const processSplit = useCallback(async (
    splitAddress: string,
    processedAddresses: Set<string> = new Set(),
    knownSplits: Map<string, any> = new Map(),
    level: number = 0,
    index: number = 0,
    totalAtLevel: number = 1,
    childPercentage?: string
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

      // Case-insensitive lookup in the address map
      const addressInfo = Object.entries(addressNames).find(
        ([addr]) => addr.toLowerCase() === normalizedAddress
      )?.[1];
      
      console.log('Looking up address:', normalizedAddress, 'Found:', addressInfo); // Debug log

      // Add node
      const nodePercentage = level === 0 ? undefined : childPercentage?.toString();

      console.log('Creating node:', {
        address: normalizedAddress,
        level,
        percentage: nodePercentage,
        addressInfo,
        splitMetadata: splitMetadata?.recipients?.map((r: { recipient: { address: string }, percentAllocation: string }) => ({
          address: r.recipient.address.toLowerCase(),
          percentage: r.percentAllocation
        }))
      });

      // If this is a headwaters node (level 0), add source nodes above it
      if (level === 0) {
        // Get all sources
        const sources = Object.entries(addressNames)
          .filter(([_, info]) => info.type === 'source')
          .map(([address, info]) => ({
            id: parseInt(address.replace('source_', '')),
            name: info.name,
            description: info.description
          }))
          .sort((a, b) => {
            // Define the order of IDs
            const order = [4, 2, 3, 7, 6, 1, 5];
            return order.indexOf(a.id) - order.indexOf(b.id);
          });

        // Create a single source node
        const sourceNode = {
          id: 'sources',
          type: 'flowNode',
          data: {
            label: 'SOURCES',
            fullAddress: 'sources',
            isSource: true,
            type: 'source',
            sources: sources.map(s => ({ name: s.name, description: s.description }))
          },
          position: {
            x: -800, // Position on the left
            y: -400 // Move up higher
          },
          draggable: true
        };

        // Add source node
        newNodes.push(sourceNode);

        // Create edge from sources to headwaters
        newEdges.push({
          id: `sources-${normalizedAddress}`,
          source: 'sources',
          target: normalizedAddress,
          sourceHandle: 'source', // Bottom handle of SOURCES
          targetHandle: 'target', // Top handle of HEADWATERS
          type: 'fluid',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#60A5FA'
          },
          style: { 
            stroke: '#60A5FA',
            strokeWidth: 2,
            opacity: 0.6
          }
        });
      }

      newNodes.push({
        id: normalizedAddress,
        type: 'flowNode',
        data: {
          label: addressInfo?.name || `${splitAddress.slice(0, 6)}...${splitAddress.slice(-4)}`,
          fullAddress: splitAddress,
          recipients: splitMetadata?.recipients || [],
          isSplit: Boolean(splitMetadata?.recipients?.length),
          isSource: false,
          type: addressInfo?.type || 'account',
          percentage: nodePercentage,
          specific_asset_id: addressInfo?.specific_asset_id
        },
        position,
        draggable: true
      });

      if (splitMetadata?.recipients) {
        // First, check all recipients in parallel to identify which ones are splits
        const recipientChecks = await Promise.all(
          splitMetadata.recipients.map(async (recipient: { recipient: { address: string }, percentAllocation: string }) => {
            const recipientAddress = recipient.recipient.address.toLowerCase();
            
            // Special case for 0x4dDEdf9e5e101A9D865FbC5401829EbD9Fda1370
            if (recipientAddress === '0x4ddedf9e5e101a9d865fbc5401829ebd9fda1370') {
              return {
                address: recipientAddress,
                isSplit: true, // Force it to be treated as a node
                percentage: recipient.percentAllocation
              };
            }
            
            // If we've already processed this address or have it in knownSplits, use cached info
            if (processedAddresses.has(recipientAddress)) {
              return {
                address: recipientAddress,
                isSplit: knownSplits.has(recipientAddress),
                percentage: recipient.percentAllocation
              };
            }

            // If it's in knownSplits but not processed, use that info
            if (knownSplits.has(recipientAddress)) {
              const metadata = knownSplits.get(recipientAddress);
              return {
                address: recipientAddress,
                isSplit: Boolean(metadata?.recipients?.length),
                percentage: recipient.percentAllocation
              };
            }

            // Only check new addresses
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
              console.warn(`Error checking if ${recipientAddress} is split:`, err);
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
          // Determine if this is a return flow (going to a previously seen node)
          const isReturnFlow = processedAddresses.has(address.toLowerCase());
          
          newEdges.push({
            id: `${normalizedAddress}-${address}`,
            source: normalizedAddress,
            target: address,
            sourceHandle: 'source',
            targetHandle: 'target',
            label: `${Math.round(percentage)}%`,
            type: 'fluid',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: isReturnFlow ? '#93C5FD' : '#60A5FA' // Lighter blue for return flows
            },
            style: { 
              stroke: isReturnFlow ? '#93C5FD' : '#60A5FA', // Lighter blue for return flows
              strokeWidth: 2,
              opacity: 0.6
            },
            data: {
              isReturnFlow
            }
          });
        });

        // Process new splits in parallel if not at max depth
        if (level < 3) {
          const childResults = await Promise.all(
            splitRecipients
              .filter(r => !processedAddresses.has(r.address))
              .map((r, idx) => {
                // Get the percentage from the parent's metadata
                const childPercentage = splitMetadata?.recipients?.find(
                  (recipient: { recipient: { address: string }, percentAllocation: string }) => recipient.recipient.address.toLowerCase() === r.address.toLowerCase()
                )?.percentAllocation;

                return processSplit(
                  r.address, 
                  processedAddresses, 
                  knownSplits, 
                  level + 1,
                  idx,
                  splitRecipients.length,
                  childPercentage // Pass the percentage to the child
                )
              })
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
            fullAddress: splitAddress,
            isSplit: false,
            recipients: []
          },
          position,
          draggable: true
        });
      }
      return { nodes: newNodes, edges: newEdges };
    }
  }, [chainId, splitsClient, addressNames]);

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

        // Add NATURAL ASSETS node below all others
        if (newNodes.length > 0) {
          // Find the max y position among all nodes
          const maxY = Math.max(...newNodes.map(n => n.position.y));
          // Center horizontally (average x of all nodes)
          const avgX = newNodes.reduce((sum, n) => sum + n.position.x, 0) / newNodes.length;
          newNodes.push({
            id: 'natural-assets',
            type: 'flowNode',
            data: {
              type: 'naturalAssets',
            },
            position: {
              x: avgX - 360, // Center the long node (width 720px)
              y: maxY + 300
            },
            draggable: false
          });
        }
        setNodes(newNodes);
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
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-900">
        <div className="text-gray-200">loading proceeds data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-900">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] pb-16 bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
      </ReactFlow>
    </div>
  );
} 