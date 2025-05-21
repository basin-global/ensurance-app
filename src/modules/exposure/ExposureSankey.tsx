import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyData {
  source: string;
  target: string;
  value: number;
}

interface ExposureSankeyProps {
  data: SankeyData[];
}

export default function ExposureSankey({ data }: ExposureSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const width = 1000;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create Sankey generator
    const sankeyGenerator = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    // Create nodes array
    const nodeNames = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
    const nodes = nodeNames.map(name => ({ name }));

    // Create links array
    const links = data.map(d => ({
      source: nodes.find(n => n.name === d.source),
      target: nodes.find(n => n.name === d.target),
      value: d.value
    }));

    // Process data
    const { nodes: processedNodes, links: processedLinks } = sankeyGenerator({
      nodes,
      links
    });

    // Color scale for nodes
    const colorScale = d3.scaleOrdinal()
      .domain(['Food & Agriculture', 'Energy & Power', 'Raw Materials', 'Food', 'Energy', 'Water Abundance', 'Healthy Soils', 'Medicinal & Genetic', 'Climate Stability', 'Clean Air', 'Clean Water', 'Risk Resilience', 'Pollination', 'Erosion Control', 'Pest & Disease Control', 'Habitat', 'Recreation & Experiences', 'Research & Learning', 'Aesthetic & Sensory', 'Art & Inspiration', 'Existence & Legacy', 'Tropical Forest', 'Temperate Forest'])
      .range(d3.schemeCategory10);

    // Draw links
    const link = svg.append('g')
      .selectAll('path')
      .data(processedLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => {
        const sourceNode = processedNodes.find(n => n.name === (d.source as any).name);
        const color = sourceNode ? colorScale(sourceNode.name) : '#000';
        // Restore original opacity for all links
        return d3.color(color as string).copy({ opacity: 0.2 }).toString();
      })
      .attr('stroke-width', d => {
        const value = d.value;
        // Wider links: 1=4px, 2=8px, 3=12px
        return Math.max(4, value * 4);
      })
      .style('transition', 'opacity 0.3s');

    // Draw nodes with uniform size
    const node = svg.append('g')
      .selectAll('rect')
      .data(processedNodes)
      .join('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', d => colorScale(d.name) as string)
      .attr('stroke', '#000')
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.3s')
      .on('mouseover', (event, d) => {
        setHoveredNode(d.name);
        // Tooltip and highlight logic remains
        link.style('opacity', l => 
          (l.source as any).name === d.name || (l.target as any).name === d.name ? 1 : 0.1
        );
        node.style('opacity', n => 
          n.name === d.name || 
          processedLinks.some(l => ((l.source as any).name === d.name && (l.target as any).name === n.name) || 
                         ((l.target as any).name === d.name && (l.source as any).name === n.name)) ? 1 : 0.1
        );
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        link.style('opacity', 1);
        node.style('opacity', 1);
      });

    // Add labels with improved visibility
    svg.append('g')
      .selectAll('text')
      .data(processedNodes)
      .join('text')
      .attr('x', d => (d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6)
      .attr('y', d => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 || 0) < width / 2 ? 'start' : 'end')
      .text(d => d.name)
      .style('font-size', '12px')
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)'); // Add text shadow for better readability

  }, [data]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-full" />
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg">
          <h3 className="font-bold mb-2">{hoveredNode}</h3>
          <p>Click to see details</p>
        </div>
      )}
    </div>
  );
} 