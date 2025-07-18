import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useRouter, useSearchParams } from 'next/navigation';
import { SpecificAsset } from '../specific/SpecificAsset';
import { getAssetIdForNode, hasAsset } from './assetMapping';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CONTRACTS } from '../specific/config';

interface SankeyData {
  source: string;
  target: string;
  value: number;
}

interface SankeyNode extends d3.SimulationNodeDatum {
  name: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  layer: number; // 0: sectors, 1: ES, 2: stocks
}

interface SankeyLink extends d3.SimulationLinkDatum<SankeyNode> {
  value: number;
  source: SankeyNode;
  target: SankeyNode;
}

interface ExposureSankeyProps {
  data: SankeyData[];
}

// Helper function to determine node layer
function getNodeLayer(name: string): number {
  if (['Food & Agriculture', 'Energy & Power', 'Manufacturing & Materials', 'Infrastructure & Construction', 'Finance & Insurance', 'Retail', 'Transportation & Logistics'].includes(name)) return 0;
  if (['Rivers & Lakes', 'Tropical Forest', 'Temperate Forest'].includes(name)) return 2;
  return 1; // All other nodes are ES
}

// Custom vertical link path generator
function sankeyLinkVertical() {
  return (d: any) => {
    const sourceX = (d.source.x0 + d.source.x1) / 2;
    const targetX = (d.target.x0 + d.target.x1) / 2;
    const sourceY = d.source.y1;
    const targetY = d.target.y0;
    
    return `M${sourceX},${sourceY}
            C${sourceX},${(sourceY + targetY) / 2}
             ${targetX},${(sourceY + targetY) / 2}
             ${targetX},${targetY}`;
  };
}

// Update link width scaling
const getLinkWidth = (value: number, isActive: boolean = false) => {
  if (isActive) {
    switch (value) {
      case 3: return 16;  // High - even thicker when active
      case 2: return 8;   // Moderate - thicker when active
      case 1: return 2;   // Low - slightly thicker when active
      default: return 2;
    }
  } else {
    switch (value) {
      case 3: return 12;  // High
      case 2: return 4;   // Moderate
      case 1: return 1;   // Low
      default: return 1;
    }
  }
};

// Update node height scaling to use normalized values
const getNodeHeight = (magnitude: number) => {
  const minHeight = 30;  // Smaller minimum for less important nodes
  const maxHeight = 80;  // Cap maximum height for better visual balance
  return minHeight + (magnitude * (maxHeight - minHeight));
};

// Helper function to get node category and type
function getNodeCategory(name: string): { type: string; category: string } {
  if (['Food & Agriculture', 'Energy & Power', 'Manufacturing & Materials', 'Infrastructure & Construction', 'Finance & Insurance', 'Retail', 'Transportation & Logistics'].includes(name)) {
    return { type: 'SECTOR', category: 'economic sector' };
  }
  if (['Rivers & Lakes', 'Tropical Forest', 'Temperate Forest', 'Boreal Forest', 'Coastal Systems', 'Inland Wetlands', 'Cultivated & Developed', 'Urban Open Space', 'Rural Open Space', 'Marine Systems', 'Grasslands', 'Shrublands', 'Polar & Alpine', 'Desert', 'Subterranean'].includes(name)) {
    return { type: 'STOCK', category: 'ecosystem' };
  }
  return { type: 'FLOW', category: 'ecosystem service' };
}

export default function ExposureSankey({ data }: ExposureSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [processedLinks, setProcessedLinks] = useState<SankeyLink[]>([]);
  const [overviewMagnitudes, setOverviewMagnitudes] = useState<Map<string, number>>(new Map());
  
  // Update URL when selection changes
  const updateSelection = (node: string | null) => {
    setSelectedNode(node);
    if (node) {
      const { type } = getNodeCategory(node);
      const param = type.toLowerCase();
      // Replace multiple spaces and special chars with single hyphen
      const cleanName = node.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
      router.push(`/exposure?${param}=${cleanName}`);
    } else {
      router.push('/exposure');
    }
  };

  // Initialize selected node from URL
  useEffect(() => {
    const sector = searchParams.get('sector');
    const flow = searchParams.get('flow');
    const stock = searchParams.get('stock');
    const selected = sector || flow || stock;
    if (selected) {
      // Find the original node name from the data
      const nodeNames = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
      const originalName = nodeNames.find(name => 
        name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') === selected
      );
      if (originalName) {
        setSelectedNode(originalName);
      }
    }
  }, [searchParams, data]);

  // Handle click outside to reset selection
  const handleContainerClick = (e: React.MouseEvent) => {
    // Clear selection if click is on container or SVG background
    if (e.target === containerRef.current || e.target === svgRef.current) {
      updateSelection(null);
      setHoveredNode(null);
    }
  };
  
  // Create and update the Sankey diagram
  useEffect(() => {
    if (!data.length) return;
    
    // Force redraw on resize
    const redrawChart = () => {
      if (!containerRef.current || !svgRef.current) return;
      
      // Clear any existing content
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      
      // Get the actual dimensions of the container
      const containerRect = containerRef.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      
      if (width === 0 || height === 0) return;
      
      // Debug dimensions
      console.log(`Container dimensions: ${width}x${height}`);
      
      // Set SVG dimensions
      svg
        .attr("width", width)
        .attr("height", height);
      
      // Use larger margins to avoid edges
      const margin = { top: 100, right: 100, bottom: 50, left: 50 };  // Increased right margin
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create nodes array with layer information
      const nodeNames = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
      const nodes: SankeyNode[] = nodeNames.map(name => ({ 
        name,
        layer: getNodeLayer(name)
      }));
      
      // Calculate magnitudes for overview mode (all connections)
      const magnitudes = new Map<string, number>();
      const rowMagnitudes = new Map<number, { min: number, max: number }>();
      
      // First pass: calculate raw magnitudes and find min/max for each row
      nodes.forEach(node => {
        const incomingSum = data
          .filter(d => d.target === node.name)
          .reduce((sum, d) => sum + d.value, 0);
        const outgoingSum = data
          .filter(d => d.source === node.name)
          .reduce((sum, d) => sum + d.value, 0);
        let magnitude;
        if (node.layer === 0) {
          // For industry nodes, use outgoing sum
          magnitude = outgoingSum;
        } else if (node.layer === 1) {
          // For ES nodes, use both
          magnitude = incomingSum + outgoingSum;
        } else {
          // For stock nodes, use incoming sum
          magnitude = incomingSum;
        }
        magnitudes.set(node.name, magnitude);
        // Update row min/max
        const row = rowMagnitudes.get(node.layer) || { min: Infinity, max: -Infinity };
        row.min = Math.min(row.min, magnitude);
        row.max = Math.max(row.max, magnitude);
        rowMagnitudes.set(node.layer, row);
      });

      // Normalize overview magnitudes with a minimum width for sectors
      nodes.forEach(node => {
        const row = rowMagnitudes.get(node.layer)!;
        const rawMagnitude = magnitudes.get(node.name)!;
        let normalizedMagnitude = (rawMagnitude - row.min) / (row.max - row.min);
        
        // Ensure minimum width for sectors
        if (node.layer === 0) {
          normalizedMagnitude = Math.max(normalizedMagnitude, 0.1); // Minimum 10% width for sectors
        }
        
        magnitudes.set(node.name, normalizedMagnitude);
      });

      // Store overview magnitudes for later use
      setOverviewMagnitudes(magnitudes);

      // Function to calculate hover state magnitudes
      const getHoverMagnitudes = (activeNode: string | null) => {
        if (!activeNode) return magnitudes;
        
        const hoverMagnitudes = new Map<string, number>();
        const activeLinks = processedLinks.filter(
          l => l.source.name === activeNode || l.target.name === activeNode
        );
        
        // Calculate magnitudes based on active connections
        nodes.forEach(node => {
          const incomingSum = activeLinks
            .filter(l => l.target.name === node.name)
            .reduce((sum, l) => sum + l.value, 0);
          
          let magnitude;
          if (node.layer === 1) {
            // For ecosystem services, consider both incoming and outgoing
            const outgoingSum = activeLinks
              .filter(l => l.source.name === node.name)
              .reduce((sum, l) => sum + l.value, 0);
            magnitude = Math.max(incomingSum, outgoingSum); // Use max instead of sum
          } else {
            magnitude = incomingSum;
          }
          
          // Ensure minimum magnitude to prevent nodes from disappearing
          hoverMagnitudes.set(node.name, Math.max(magnitude, 0.1));
        });

        // Normalize hover magnitudes within each row
        const rowHoverMagnitudes = new Map<number, { min: number, max: number }>();
        
        // First pass: find min/max for each row
        nodes.forEach(node => {
          const magnitude = hoverMagnitudes.get(node.name)!;
          const row = rowHoverMagnitudes.get(node.layer) || { min: Infinity, max: -Infinity };
          row.min = Math.min(row.min, magnitude);
          row.max = Math.max(row.max, magnitude);
          rowHoverMagnitudes.set(node.layer, row);
        });

        // Second pass: normalize within each row
        nodes.forEach(node => {
          const row = rowHoverMagnitudes.get(node.layer)!;
          const rawMagnitude = hoverMagnitudes.get(node.name)!;
          const normalizedMagnitude = (rawMagnitude - row.min) / (row.max - row.min);
          hoverMagnitudes.set(node.name, normalizedMagnitude);
        });

        return hoverMagnitudes;
      };

      // Create links array
      const links: SankeyLink[] = data.map(d => ({
        source: nodes.find(n => n.name === d.source)!,
        target: nodes.find(n => n.name === d.target)!,
        value: d.value
      }));
      
      // Create Sankey generator
      const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
        .nodeWidth(20)  // Increased node width
        .nodePadding(15) // Increased padding
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);
      
      // Process data
      const { nodes: processedNodes, links: processedLinks } = sankeyGenerator({
        nodes,
        links
      });
      
      // Store processed links for the side panel
      setProcessedLinks(processedLinks);
      
      // --- TRUE BAR LAYOUT LOGIC ---
      // 1. Calculate total magnitude for each layer
      const layerTotals = [0, 1, 2].map(layer =>
        nodes.filter(n => n.layer === layer).reduce((sum, n) => sum + (magnitudes.get(n.name) || 0), 0)
      );

      // 2. Assign segment widths and positions for each node in each layer
      const layerYPositions = [
        margin.top + innerHeight * 0.1,   // Top row
        margin.top + innerHeight * 0.4,   // Middle row
        margin.top + innerHeight * 0.7    // Bottom row
      ];
      const barHeight = 40;
      const barGap = 30;
      const barAreaWidth = innerWidth;

      // For each layer, calculate segment positions
      const nodePositions = new Map<string, { x0: number, x1: number, y0: number, y1: number }>();
      [0, 1, 2].forEach(layer => {
        const layerNodes = nodes.filter(n => n.layer === layer);
        // Sort for visual consistency
        layerNodes.sort((a, b) => a.name.localeCompare(b.name));
        let currentX = margin.left;
        layerNodes.forEach(n => {
          const mag = magnitudes.get(n.name) || 0;
          const width = layerTotals[layer] > 0 ? (mag / layerTotals[layer]) * barAreaWidth : 0;
          nodePositions.set(n.name, {
            x0: currentX,
            x1: currentX + width,
            y0: layerYPositions[layer],
            y1: layerYPositions[layer] + barHeight
          });
          currentX += width;
        });
      });

      // Helper: get set of connected node names for a given node
      function getConnectedNodes(nodeName: string) {
        const connected = new Set<string>();
        links.forEach(l => {
          if (l.source.name === nodeName) connected.add(l.target.name);
          if (l.target.name === nodeName) connected.add(l.source.name);
        });
        return connected;
      }
      const activeNode = selectedNode || hoveredNode;
      const connectedNodes = activeNode ? getConnectedNodes(activeNode) : new Set();

      // 3. Draw bars (segments) with isolation effect
      const mainGroup = svg.append('g');
      
      // Create a separate group for labels that will be rendered on top
      const labelGroup = svg.append('g').style('z-index', '10');

      // Add row labels
      const rowLabels = ['SECTORS', 'FLOWS', 'STOCKS'];
      const rowAssetIds = [null, 5, 4]; // Asset IDs for each row
      [0, 1, 2].forEach(layer => {
        const yPos = layerYPositions[layer] + (barHeight / 2) - 25;
        const labelGroup = mainGroup.append('g')
          .attr('transform', `translate(${margin.left - 10}, ${yPos})`);

        // Add the row label
        const textElement = labelGroup.append('text')
          .attr('text-anchor', 'end')
          .attr('transform', `rotate(-90, 0, 0)`)
          .text(rowLabels[layer])
          .style('font-size', '14px')
          .style('font-family', 'Inter, system-ui, sans-serif')
          .style('font-weight', '700')
          .style('fill', '#aaa')
          .style('text-transform', 'uppercase')
          .style('letter-spacing', '0.05em')
          .style('z-index', '10');

        // Add + button if there's an asset ID
        if (rowAssetIds[layer] !== null) {
          // Aggressively move the + button left and tightly inline with the end of the label
          const buttonGroup = labelGroup.append('g')
            .attr('transform', `translate(-4, -12) rotate(-90)`)
            .style('cursor', 'pointer')
            .on('click', (e) => {
              e.stopPropagation();
              window.location.href = `/specific/${CONTRACTS.specific}/${rowAssetIds[layer]}`;
            });

          // Add button background
          buttonGroup.append('circle')
            .attr('r', 8)
            .style('fill', 'rgba(0,0,0,0.4)');

          // Add plus icon (white by default)
          const plusPath = buttonGroup.append('path')
            .attr('d', 'M-4,0 L4,0 M0,-4 L0,4')
            .style('stroke', '#fff')
            .style('stroke-width', '1.5')
            .style('stroke-linecap', 'round');

          // Add tooltip
          const tooltip = buttonGroup.append('text')
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#fff')
            .style('opacity', 0)
            .style('pointer-events', 'none')
            .text(`Purchase ${rowLabels[layer].toLowerCase()} Natural Capital Ensurance`);

          // Show tooltip and change plus color on hover
          buttonGroup
            .on('mouseover', () => {
              tooltip.style('opacity', 1);
              plusPath.style('stroke', '#22c55e');
            })
            .on('mouseout', () => {
              tooltip.style('opacity', 0);
              plusPath.style('stroke', '#fff');
            });
        }
      });

      // Color scale
      const colorScale = d3.scaleOrdinal<string>()
        .domain(nodeNames)
        .range([
          // Sectors (layer 0) - Business/Anthropogenic colors
          '#2C3E50', // Deep blue-gray (Finance)
          '#E74C3C', // Red (Energy)
          '#F39C12', // Orange (Manufacturing)
          '#27AE60', // Green (Agriculture)
          '#8E44AD', // Purple (Infrastructure)
          '#16A085', // Teal (Retail)
          '#D35400', // Dark orange (Transportation)
          
          // Flows (layer 1) - Dynamic/Fluid colors
          '#00BCD4', // Cyan (Water)
          '#4CAF50', // Green (Air)
          '#9C27B0', // Purple (Nutrients)
          '#FF9800', // Orange (Carbon)
          '#2196F3', // Blue (Energy)
          '#FFEB3B', // Yellow (Food)
          '#795548', // Brown (Materials)
          
          // Stocks (layer 2) - Earth/Grounded tones
          '#1B5E20', // Dark green (Forests)
          '#0D47A1', // Deep blue (Water)
          '#33691E', // Dark olive (Grasslands)
          '#004D40', // Dark teal (Wetlands)
          '#3E2723', // Dark brown (Soil)
          '#263238', // Dark blue-gray (Urban)
          '#827717'  // Dark lime (Desert)
        ]);

      // Adjust link colors to be more subtle
      const getLinkColor = (source: string): string => {
        const color = d3.color(colorScale(source));
        return color ? color.copy({ opacity: 0.25 }).toString() : '#ccc';
      };

      [0, 1, 2].forEach(layer => {
        const layerNodes = nodes.filter(n => n.layer === layer);
        const group = mainGroup.append('g').attr('class', `bar-layer-${layer}`);
        layerNodes.forEach(n => {
          const pos = nodePositions.get(n.name)!;
          // Determine opacity
          let opacity = 1;
          if (activeNode) {
            const activeNodeType = getNodeCategory(activeNode).type;
            if (activeNodeType === 'SECTOR') {
              // For sectors, show the sector, its connected flows, and all stocks
              if (n.name === activeNode || 
                  connectedNodes.has(n.name) || 
                  getNodeCategory(n.name).type === 'STOCK') {
                opacity = 1;
              } else {
                opacity = 0.1;
              }
            } else {
              // For other nodes, show only direct connections
              if (n.name === activeNode || connectedNodes.has(n.name)) {
                opacity = 1;
              } else {
                opacity = 0.1;
              }
            }
          } else {
            // Default state: calm but readable
            opacity = 0.85;
          }
          group.append('rect')
            .attr('x', pos.x0)
            .attr('y', pos.y0)
            .attr('width', pos.x1 - pos.x0)
            .attr('height', barHeight)
            .attr('fill', colorScale(n.name) as string)
            .attr('stroke', '#000')
            .attr('rx', 6)
            .attr('ry', 6)
            .style('cursor', 'pointer')
            .style('opacity', opacity)
            .on('mouseover', () => setHoveredNode(n.name))
            .on('mouseout', () => { if (!selectedNode) setHoveredNode(null); })
            .on('click', () => updateSelection(n.name));
          // Add label
          const label = labelGroup.append('text')
            .attr('x', (pos.x0 + pos.x1) / 2)
            .attr('y', pos.y0 - 36)  // Increased spacing slightly more
            .attr('text-anchor', 'middle')
            .attr('transform', `rotate(-45, ${(pos.x0 + pos.x1) / 2}, ${pos.y0 - 36})`)
            .text(n.name)
            .style('font-size', '11px')
            .style('font-family', 'Inter, system-ui, sans-serif')
            .style('font-weight', '500')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)')
            .style('white-space', 'nowrap')
            .style('opacity', 0.85 * opacity);

          // Add background for better readability
          const bbox = label.node()?.getBBox();
          if (bbox) {
            labelGroup.insert('rect', 'text')
              .attr('x', bbox.x - 4)
              .attr('y', bbox.y - 2)
              .attr('width', bbox.width + 8)
              .attr('height', bbox.height + 4)
              .attr('rx', 4)
              .attr('ry', 4)
              .style('fill', 'rgba(0,0,0,0.4)')
              .style('opacity', 0.85 * opacity)
              .style('transform', `translateY(-${bbox.height/2}px)`); // Shift background up to avoid node overlap
          }

          // Add SpecificAsset button if node is active and has an asset
          if (n.name === activeNode && hasAsset(n.name) && bbox) {
            // Place the + button at the end of the diagonal label, with more space
            const padding = 12;
            const angle = -45 * (Math.PI / 180); // radians
            const dx = (bbox.width / 2 + padding) * Math.cos(angle);
            const dy = (bbox.width / 2 + padding) * Math.sin(angle);
            const buttonGroup = labelGroup.append('g')
              .attr('transform', `translate(${(pos.x0 + pos.x1) / 2 + dx}, ${pos.y0 - 36 + dy})`)
              .style('cursor', 'pointer')
              .on('click', (e) => {
                e.stopPropagation(); // Prevent node selection
                window.location.href = `/specific/${CONTRACTS.specific}/${getAssetIdForNode(n.name)}`;
              });

            // Add button background
            buttonGroup.append('circle')
              .attr('r', 8)
              .style('fill', 'rgba(0,0,0,0.4)')
              .style('opacity', 0.85 * opacity);

            // Add plus icon (white by default)
            const plusPath = buttonGroup.append('path')
              .attr('d', 'M-4,0 L4,0 M0,-4 L0,4')
              .style('stroke', '#fff')
              .style('stroke-width', '1.5')
              .style('stroke-linecap', 'round');

            // Add tooltip
            const tooltip = buttonGroup.append('text')
              .attr('y', -12)
              .attr('text-anchor', 'middle')
              .style('font-size', '10px')
              .style('fill', '#fff')
              .style('opacity', 0)
              .style('pointer-events', 'none')
              .text(getNodeCategory(n.name).type === 'SECTOR' 
                ? `Purchase ${n.name} Industry Ensurance`
                : `Purchase ${n.name} Natural Capital Ensurance`);

            // Show tooltip and change plus color on hover
            buttonGroup
              .on('mouseover', () => {
                tooltip.style('opacity', 1);
                plusPath.style('stroke', '#22c55e');
              })
              .on('mouseout', () => {
                tooltip.style('opacity', 0);
                plusPath.style('stroke', '#fff');
              });
          }
        });
      });

      // 4. Draw links using new positions, with isolation effect
      mainGroup.append('g')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', d => {
          const source = nodePositions.get(d.source.name)!;
          const target = nodePositions.get(d.target.name)!;
          const sourceX = (source.x0 + source.x1) / 2;
          const sourceY = source.y1;
          const targetX = (target.x0 + target.x1) / 2;
          const targetY = target.y0;
          return `M${sourceX},${sourceY} C${sourceX},${(sourceY + targetY) / 2} ${targetX},${(sourceY + targetY) / 2} ${targetX},${targetY}`;
        })
        .attr('fill', 'none')
        .attr('stroke', d => getLinkColor(d.source.name))
        .attr('stroke-width', d => {
          const isActive = d.source.name === activeNode || d.target.name === activeNode;
          return getLinkWidth(d.value, isActive);
        })
        .style('transition', 'opacity 0.3s, stroke-width 0.3s')
        .style('opacity', d => {
          if (!activeNode) return 0.25;
          const activeNodeType = getNodeCategory(activeNode).type;
          
          if (activeNodeType === 'SECTOR') {
            // For sectors, show both direct connections and flow-to-stock connections
            return (d.source.name === activeNode || 
                   (getNodeCategory(d.source.name).type === 'FLOW' && 
                    getNodeCategory(d.target.name).type === 'STOCK')) ? 1 : 0.1;
          }
          
          // For other nodes, show only direct connections
          return (d.source.name === activeNode || d.target.name === activeNode) ? 1 : 0.1;
        });
    };
    
    // Initial render
    redrawChart();
    
    // Add resize listener
    window.addEventListener('resize', redrawChart);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', redrawChart);
    };
  }, [data, selectedNode, hoveredNode]);
  
  return (
    <div className="flex w-full h-full">
      <div 
        ref={containerRef} 
        className="w-3/4 h-full" 
        style={{
          position: 'relative'
        }}
        onClick={handleContainerClick}
      >
        <svg 
          ref={svgRef} 
          style={{
            display: 'block',
            width: '100%',
            height: '100%'
          }} 
        />
      </div>
      
      <div 
        className="w-1/4 h-full bg-black/5 border-l border-gray-800/60 p-4 overflow-y-auto"
        style={{
          backdropFilter: 'blur(4px)',
          position: 'relative',
          height: 'auto',
        }}
      >
        {(hoveredNode || selectedNode) ? (
          <div className="space-y-4">
            {selectedNode && (
              <button
                onClick={() => {
                  updateSelection(null);
                  setHoveredNode(null);
                }}
                className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Clear selection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-xl">{selectedNode || hoveredNode}</h3>
                {(() => {
                  const nodeName = selectedNode || hoveredNode;
                  if (!nodeName) return null;
                  return hasAsset(nodeName) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <SpecificAsset tokenId={getAssetIdForNode(nodeName)!} />
                        </TooltipTrigger>
                        <TooltipContent>
                          {getNodeCategory(nodeName).type === 'SECTOR' 
                            ? `Purchase ${nodeName} Industry Ensurance`
                            : `Purchase ${nodeName} Natural Capital Ensurance`
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
              </div>
              {(() => {
                const nodeName = selectedNode || hoveredNode;
                if (!nodeName) return null;
                const { type, category } = getNodeCategory(nodeName);
                return (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">{type}</span>
                    <span className="text-gray-400">|</span>
                    <span>{category}</span>
                  </div>
                );
              })()}
            </div>
            
            <div className="space-y-2">
              {/* Custom connection logic by node type */}
              {(() => {
                const nodeName = selectedNode || hoveredNode;
                if (!nodeName) return null;
                const { type } = getNodeCategory(nodeName);
                // Helper to convert value to label and color
                const valueLabel = (v: number) => v === 1 ? 'low' : v === 2 ? 'moderate' : v === 3 ? 'high' : v;
                // Use yellow for moderate for better aesthetics
                const valueColor = (v: number) => v === 1 ? 'text-green-700' : v === 2 ? 'text-yellow-500' : v === 3 ? 'text-red-600' : 'text-gray-600';
                if (type === 'SECTOR') {
                  const flows = processedLinks
                    .filter(l => l.source.name === nodeName)
                    .map(l => ({ name: l.target.name, value: l.value }));
                  return (
                    <>
                      <h4 className="font-grotesk font-medium text-xs text-gray-700 mb-1 uppercase tracking-wide">Flows</h4>
                      <div className="space-y-1">
                        {flows.map((f, i) => (
                          <div key={i} className="text-sm flex items-center font-grotesk">
                            <span>{f.name}</span>
                            <span className={`ml-2 font-mono font-medium ${valueColor(f.value)}`}>{valueLabel(f.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                } else if (type === 'FLOW') {
                  const sectors = processedLinks
                    .filter(l => l.target.name === nodeName && getNodeCategory(l.source.name).type === 'SECTOR')
                    .map(l => ({ name: l.source.name, value: l.value }));
                  const stocks = processedLinks
                    .filter(l => l.source.name === nodeName && getNodeCategory(l.target.name).type === 'STOCK')
                    .map(l => ({ name: l.target.name, value: l.value }));
                  return (
                    <>
                      <h4 className="font-grotesk font-medium text-xs text-gray-700 mb-1 uppercase tracking-wide">Sectors</h4>
                      <div className="space-y-1 mb-2">
                        {sectors.map((s, i) => (
                          <div key={i} className="text-sm flex items-center font-grotesk">
                            <span>{s.name}</span>
                            <span className={`ml-2 font-mono font-medium ${valueColor(s.value)}`}>{valueLabel(s.value)}</span>
                          </div>
                        ))}
                      </div>
                      <h4 className="font-grotesk font-medium text-xs text-gray-700 mb-1 uppercase tracking-wide">Stocks</h4>
                      <div className="space-y-1">
                        {stocks.map((s, i) => (
                          <div key={i} className="text-sm flex items-center font-grotesk">
                            <span>{s.name}</span>
                            <span className={`ml-2 font-mono font-medium ${valueColor(s.value)}`}>{valueLabel(s.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                } else if (type === 'STOCK') {
                  const flows = processedLinks
                    .filter(l => l.target.name === nodeName && getNodeCategory(l.source.name).type === 'FLOW')
                    .map(l => ({ name: l.source.name, value: l.value }));
                  return (
                    <>
                      <h4 className="font-grotesk font-medium text-xs text-gray-700 mb-1 uppercase tracking-wide">Flows</h4>
              <div className="space-y-1">
                        {flows.map((f, i) => (
                          <div key={i} className="text-sm flex items-center font-grotesk">
                            <span>{f.name}</span>
                            <span className={`ml-2 font-mono font-medium ${valueColor(f.value)}`}>{valueLabel(f.value)}</span>
                    </div>
                  ))}
              </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <div className="space-y-2">
              <h4 className="font-grotesk font-medium text-xs text-gray-700 mb-1 uppercase tracking-wide">Magnitude</h4>
              <div className="text-sm font-mono font-medium text-white">
                {(() => {
                  const nodeName = selectedNode || hoveredNode;
                  if (!nodeName) return null;
                  // Sum all in and out values for this node
                  const total = processedLinks
                    .filter((l: SankeyLink) => l.source.name === nodeName || l.target.name === nodeName)
                    .reduce((sum: number, l: SankeyLink) => sum + l.value, 0);
                  return total;
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            Hover or click to explore nature risk exposure
          </div>
        )}
      </div>
    </div>
  );
} 