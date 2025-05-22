import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

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
const getLinkWidth = (value: number) => {
  switch (value) {
    case 3: return 12;  // High - exponential scale
    case 2: return 4;   // Moderate - exponential scale
    case 1: return 1;   // Low - exponential scale
    default: return 1;
  }
};

// Update node height scaling to use normalized values
const getNodeHeight = (magnitude: number) => {
  const minHeight = 30;  // Smaller minimum for less important nodes
  const maxHeight = 80;  // Cap maximum height for better visual balance
  return minHeight + (magnitude * (maxHeight - minHeight));
};

export default function ExposureSankey({ data }: ExposureSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
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
      const margin = { top: 100, right: 50, bottom: 50, left: 50 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create nodes array with layer information
      const nodeNames = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
      const nodes: SankeyNode[] = nodeNames.map(name => ({ 
        name,
        layer: getNodeLayer(name)
      }));
      
      // Calculate magnitude for each node
      const nodeMagnitudes = new Map<string, number>();
      const rowMagnitudes = new Map<number, { min: number, max: number }>();
      
      // First pass: calculate raw magnitudes and find min/max for each row
      nodes.forEach(node => {
        const incomingSum = data
          .filter(d => d.target === node.name)
          .reduce((sum, d) => sum + d.value, 0);
        
        let magnitude;
        if (node.layer === 1) {
          const outgoingSum = data
            .filter(d => d.source === node.name)
            .reduce((sum, d) => sum + d.value, 0);
          magnitude = incomingSum + outgoingSum;
        } else {
          magnitude = incomingSum;
        }
        
        nodeMagnitudes.set(node.name, magnitude);
        
        // Update row min/max
        const row = rowMagnitudes.get(node.layer) || { min: Infinity, max: -Infinity };
        row.min = Math.min(row.min, magnitude);
        row.max = Math.max(row.max, magnitude);
        rowMagnitudes.set(node.layer, row);
      });
      
      // Second pass: normalize magnitudes within each row
      nodes.forEach(node => {
        const row = rowMagnitudes.get(node.layer)!;
        const rawMagnitude = nodeMagnitudes.get(node.name)!;
        const normalizedMagnitude = (rawMagnitude - row.min) / (row.max - row.min);
        nodeMagnitudes.set(node.name, normalizedMagnitude);
      });
      
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
      
      // Force vertical layout with better spacing
      processedNodes.forEach(node => {
        // Calculate vertical positions for each layer
        const topRowY = margin.top + innerHeight * 0.1;    // Top row at 10% of height
        const middleRowY = margin.top + innerHeight * 0.4;  // Middle row at 40% of height
        const bottomRowY = margin.top + innerHeight * 0.7;  // Bottom row at 70% of height

        // Get the number of nodes in each layer for horizontal spacing
        const sectorsCount = nodes.filter(n => n.layer === 0).length;
        const servicesCount = nodes.filter(n => n.layer === 1).length;
        const stocksCount = nodes.filter(n => n.layer === 2).length;
        
        // Calculate position based on layer
        let layerY;
        const magnitude = nodeMagnitudes.get(node.name) || 0;
        const nodeHeight = getNodeHeight(magnitude);
        
        if (node.layer === 0) {
          // Sectors at top row
          const sectorIndex = processedNodes.filter(n => n.layer === 0).findIndex(n => n.name === node.name);
          layerY = topRowY;
        } else if (node.layer === 1) {
          // Ecosystem services in middle row
          const serviceIndex = processedNodes.filter(n => n.layer === 1).findIndex(n => n.name === node.name);
          layerY = middleRowY;
        } else {
          // Natural capital at bottom row
          const stockIndex = processedNodes.filter(n => n.layer === 2).findIndex(n => n.name === node.name);
          layerY = bottomRowY;
        }
        
        // Swap x and y coordinates for vertical layout
        const tempX0 = node.x0;
        const tempX1 = node.x1;
        node.x0 = node.y0;
        node.x1 = node.y1;
        node.y0 = layerY;
        node.y1 = layerY + nodeHeight;
      });
      
      // Color scale
      const colorScale = d3.scaleOrdinal()
        .domain(nodeNames)
        .range(d3.schemeCategory10);
      
      // Create a group for the Sankey diagram
      const mainGroup = svg.append('g');
      
      // Draw links with vertical paths
      const link = mainGroup.append('g')
        .selectAll('path')
        .data(processedLinks)
        .join('path')
        .attr('d', sankeyLinkVertical())
        .attr('fill', 'none')
        .attr('stroke', d => {
          const sourceNode = processedNodes.find(n => n.name === d.source.name);
          const color = sourceNode ? colorScale(sourceNode.name) : '#000';
          return d3.color(color as string)!.copy({ opacity: 0.2 }).toString();
        })
        .attr('stroke-width', d => getLinkWidth(d.value))
        .style('transition', 'opacity 0.3s');
      
      // Draw nodes
      const node = mainGroup.append('g')
        .selectAll('rect')
        .data(processedNodes)
        .join('rect')
        .attr('x', d => d.x0 || 0)
        .attr('y', d => d.y0 || 0)
        .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
        .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
        .attr('fill', d => colorScale(d.name) as string)
        .attr('stroke', '#000')
        .attr('rx', 6)
        .attr('ry', 6)
        .style('cursor', 'pointer')
        .style('transition', 'opacity 0.3s, filter 0.3s')
        .style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))')
        .on('mouseover', (event, d) => {
          setHoveredNode(d.name);
          link.style('opacity', l => 
            l.source.name === d.name || l.target.name === d.name ? 1 : 0.1
          );
          node.style('opacity', n => 
            n.name === d.name || 
            processedLinks.some(l => (l.source.name === d.name && l.target.name === n.name) || 
                           (l.target.name === d.name && l.source.name === n.name)) ? 1 : 0.1
          );
          node.style('filter', n => 
            n.name === d.name || 
            processedLinks.some(l => (l.source.name === d.name && l.target.name === n.name) || 
                           (l.target.name === d.name && l.source.name === n.name)) 
            ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' 
            : 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))'
          );
        })
        .on('mouseout', () => {
          setHoveredNode(null);
          link.style('opacity', 1);
          node.style('opacity', 1);
          node.style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))');
        });
      
      // Add labels
      const labels = mainGroup.append('g')
        .selectAll('text')
        .data(processedNodes)
        .join('text')
        .attr('x', d => ((d.x1 || 0) + (d.x0 || 0)) / 2)
        .attr('y', d => {
          if (d.layer === 1) {
            return (d.y0 || 0) - 8;
          }
          return (d.y0 || 0) - 6;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('transform', d => {
          // Angle labels by -45 degrees
          return `rotate(-45, ${((d.x1 || 0) + (d.x0 || 0)) / 2}, ${d.layer === 1 ? (d.y0 || 0) - 8 : (d.y0 || 0) - 6})`;
        })
        .text(d => d.name)
        .style('font-size', '11px')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')
        .style('white-space', 'nowrap')
        .style('opacity', 0.6)
        .style('transition', 'opacity 0.3s');
      
      // Update node hover effects
      node.on('mouseover', (event, d) => {
        setHoveredNode(d.name);
        link.style('opacity', l => 
          l.source.name === d.name || l.target.name === d.name ? 1 : 0.1
        );
        node.style('opacity', n => 
          n.name === d.name || 
          processedLinks.some(l => (l.source.name === d.name && l.target.name === n.name) || 
                         (l.target.name === d.name && l.source.name === n.name)) ? 1 : 0.1
        );
        labels.style('opacity', n => 
          n.name === d.name || 
          processedLinks.some(l => (l.source.name === d.name && l.target.name === n.name) || 
                         (l.target.name === d.name && l.source.name === n.name)) ? 1 : 0
        );
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        link.style('opacity', 1);
        node.style('opacity', 1);
        labels.style('opacity', 0.6);
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
  }, [data]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%'
      }}
    >
      <svg 
        ref={svgRef} 
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }} 
      />
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg">
          <h3 className="font-bold mb-2">{hoveredNode}</h3>
          <p>Click to see details</p>
        </div>
      )}
    </div>
  );
} 