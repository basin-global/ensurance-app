import React from 'react';
import { ViewMode, SpecificCertItem } from '../types';
import Base from './base';
import { formatEther } from 'viem';

interface SpecificCertCardProps {
  item: SpecificCertItem;
  viewMode: ViewMode;
  className?: string;
  onClick?: () => void;
}

export function SpecificCert({
  item,
  viewMode,
  className,
  onClick
}: SpecificCertCardProps) {
  const renderContent = () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Token ID:</span>
        <span>{item.tokenId}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Chain:</span>
        <span>{item.chain || 'Unknown'}</span>
      </div>
      {item.metadata && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Type:</span>
          <span>{item.metadata.type || 'Unknown'}</span>
        </div>
      )}
      {item.quantity && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Quantity:</span>
          <span>{item.quantity}</span>
        </div>
      )}
      {item.valueUsd && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Value:</span>
          <span>${item.valueUsd.toLocaleString()}</span>
        </div>
      )}
    </div>
  );

  const renderFooter = () => (
    <div className="flex justify-between">
      <button className="btn btn-sm">Mint</button>
      <button className="btn btn-sm btn-outline">Transfer</button>
    </div>
  );

  return (
    <Base
      item={item}
      viewMode={viewMode}
      className={className}
      onClick={onClick}
      renderContent={renderContent}
      renderFooter={renderFooter}
    />
  );
} 