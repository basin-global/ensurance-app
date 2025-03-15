'use client'

import React from 'react';
import { EnsureItem } from '../types';
import { MarketView } from '../views/market';

export type EnsureVariant = 
  | 'home'           // All entity types for homepage
  | 'certificates'   // Only certificate types
  | 'syndicates'     // Only syndicate types
  | 'market'         // Market view (list-based)
  | 'custom';        // Custom configuration

interface EnsureProps {
  variant?: EnsureVariant;
  walletAddress?: string;
  chainId?: string;
  urlPrefix?: string;
  className?: string;
  onItemClick?: (item: EnsureItem) => void;
}

export default function Ensure({
  variant = 'custom',
  walletAddress,
  chainId,
  urlPrefix = '',
  className,
  onItemClick,
}: EnsureProps) {
  // Route to the appropriate view based on variant
  switch (variant) {
    case 'market':
      return (
        <MarketView
          walletAddress={walletAddress}
          chainId={chainId}
          urlPrefix={urlPrefix}
          className={className}
          onItemClick={onItemClick}
        />
      );
      
    // TODO: Add other views as we create them
    case 'home':
    case 'certificates':
    case 'syndicates':
    case 'custom':
    default:
      return (
        <div className="text-center py-8 text-gray-400">
          View not implemented yet: {variant}
        </div>
      );
  }
} 