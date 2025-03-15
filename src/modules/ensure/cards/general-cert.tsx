import React from 'react'
import { ViewMode, GeneralCertItem } from '../types'
import Base from './base'
import { formatEther } from 'viem'

interface GeneralCertCardProps {
  item: GeneralCertItem;
  viewMode: ViewMode;
  className?: string;
  onClick?: () => void;
}

export function GeneralCert({
  item,
  viewMode,
  className,
  onClick
}: GeneralCertCardProps) {
  const renderContent = () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Symbol:</span>
        <span>{item.symbol}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Chain:</span>
        <span>{item.chain || 'Unknown'}</span>
      </div>
      {item.balance && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Balance:</span>
          <span>{formatEther(BigInt(item.balance))}</span>
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
      <button className="btn btn-sm">Trade</button>
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