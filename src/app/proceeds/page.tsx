'use client';

import { FlowViewer } from '@/modules/proceeds/components/viewer/ProceedsViewer';
import { SplitsWrapper } from '@/providers/splits-provider';

export default function ProceedsPage() {
  const defaultAddress = '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e';
  const chainId = 8453; // Base chain ID

  return (
    <SplitsWrapper>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <FlowViewer 
            address={defaultAddress}
            chainId={chainId}
          />
        </div>
      </div>
    </SplitsWrapper>
  );
}