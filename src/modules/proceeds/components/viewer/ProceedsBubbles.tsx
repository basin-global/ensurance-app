'use client';

import { useMemo } from 'react';
import { useSplitMetadata } from '@0xsplits/splits-sdk-react';
import { base } from 'viem/chains';

interface ProceedsRecipient {
  percentAllocation: number;
  recipient: {
    address: string;
    ens?: string;
  };
}

interface ProceedsBarProps {
  recipients: ProceedsRecipient[];
  isFlowView?: boolean;
}

function BubbleVisualization({ recipients, colors }: { 
  recipients: ProceedsRecipient[],
  colors: string[] 
}) {
  // Calculate bubble sizes and positions
  const bubbles = useMemo(() => {
    const containerWidth = 200;
    const containerHeight = 160;
    const maxRadius = Math.min(containerHeight / 2.5, containerWidth / 3);
    
    // Sort recipients by percentage for better nesting
    const sortedRecipients = [...recipients].sort((a, b) => b.percentAllocation - a.percentAllocation);
    
    return sortedRecipients.map((recipient, index) => {
      // Calculate radius based on percentage
      const radius = Math.max((recipient.percentAllocation / 100) * maxRadius * 1.5, 12);
      
      // Calculate position
      const angle = (index / recipients.length) * Math.PI * 2;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      // Position based on percentage
      const orbitRadius = (containerWidth / 4) * (1 - recipient.percentAllocation / 150);
      const x = centerX + Math.cos(angle) * orbitRadius;
      const y = centerY + Math.sin(angle) * orbitRadius;

      return {
        ...recipient,
        radius,
        x,
        y,
        color: colors[index]
      };
    });
  }, [recipients, colors]);

  return (
    <div className="relative w-full h-full">
      <svg width="100%" height="100%" viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet">
        {/* Draw connecting lines between bubbles */}
        {bubbles.map((bubble, i) => (
          bubbles.slice(i + 1).map((nextBubble, j) => (
            <path
              key={`${bubble.recipient.address}-${nextBubble.recipient.address}`}
              d={`M ${bubble.x} ${bubble.y} L ${nextBubble.x} ${nextBubble.y}`}
              fill="none"
              stroke={bubble.color}
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
          ))
        ))}
        
        {/* Draw bubbles */}
        {bubbles.map((bubble, i) => (
          <g key={bubble.recipient.address}>
            {/* Main bubble */}
            <circle
              cx={bubble.x}
              cy={bubble.y}
              r={bubble.radius}
              fill={bubble.color}
              fillOpacity={0.6}
              stroke={bubble.color}
              strokeOpacity={0.8}
              strokeWidth={1}
            />
            
            {/* Percentage label */}
            <text
              x={bubble.x}
              y={bubble.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-xs font-medium pointer-events-none select-none"
              style={{ fontSize: Math.max(10, bubble.radius / 1.8) }}
            >
              {Math.round(bubble.percentAllocation)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ProceedsBar({ recipients, isFlowView = false }: ProceedsBarProps) {
  // Get split metadata if the address is a split contract
  const { splitMetadata } = useSplitMetadata(
    base.id, 
    recipients[0]?.recipient.address
  );

  // Use split metadata if available, otherwise use passed recipients
  const displayRecipients = useMemo(() => {
    if (splitMetadata?.recipients) {
      return splitMetadata.recipients;
    }
    return recipients;
  }, [splitMetadata, recipients]);

  // Generate colors for bubbles
  const colors = useMemo(() => {
    return displayRecipients.map((_, index) => {
      const hue = (index * 137.508) % 360;
      return `hsl(${hue}, 70%, 65%)`;
    });
  }, [displayRecipients]);

  return (
    <div className={`flex flex-col gap-2 ${!isFlowView && 'cursor-pointer hover:opacity-90 transition-opacity'}`}>
      {!isFlowView && (
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          {displayRecipients.length} {displayRecipients.length === 1 ? 'Beneficiary' : 'Beneficiaries'}
          <span className="text-xs text-gray-500">(click to view)</span>
        </h3>
      )}
      <BubbleVisualization recipients={displayRecipients} colors={colors} />
    </div>
  );
}

interface ProceedsBubblesProps {
  recipients: ProceedsRecipient[];
  isFlowView?: boolean;
}

export function ProceedsBubbles({ recipients, isFlowView = false }: ProceedsBubblesProps) {
  // Generate colors for bubbles
  const colors = useMemo(() => {
    return recipients.map((_, index) => {
      const hue = (index * 137.508) % 360;
      return `hsl(${hue}, 70%, 65%)`;
    });
  }, [recipients]);

  return (
    <div className="relative w-full h-full">
      <BubbleVisualization recipients={recipients} colors={colors} />
    </div>
  );
} 