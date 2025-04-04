'use client';

import { useEffect } from 'react';
import { useSplitMetadata } from '@0xsplits/splits-sdk-react';

interface SplitLevelProps {
  address: string;
  chainId: number;
  level: number;
  onSplitFound: (level: number, address: string, metadata: any) => void;
}

export function SplitLevel({ address, chainId, level, onSplitFound }: SplitLevelProps) {
  const { splitMetadata } = useSplitMetadata(chainId, address);

  useEffect(() => {
    if (splitMetadata) {
      onSplitFound(level, address, splitMetadata);
    }
  }, [splitMetadata, level, address, onSplitFound]);

  if (!splitMetadata?.recipients) return null;

  return (
    <>
      {splitMetadata.recipients.map(recipient => (
        <SplitLevel
          key={recipient.recipient.address}
          address={recipient.recipient.address}
          chainId={chainId}
          level={level + 1}
          onSplitFound={onSplitFound}
        />
      ))}
    </>
  );
} 