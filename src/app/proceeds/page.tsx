'use client';

import { FlowViewer } from '@/modules/proceeds/flows/FlowViewer';
import { SplitsWrapper } from '@/modules/proceeds/splits-provider';

export default function ProceedsPage() {
  const defaultAddress = '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e';
  const chainId = 8453; // Base chain ID

  return (
    <SplitsWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mb-8">
          <h1 className="text-3xl font-bold mb-2">ensurance proceeds</h1>
          <p className="text-gray-400">perpetual funding for natural capital & the people who steward it</p>
        </div>
        <FlowViewer 
          address={defaultAddress}
          chainId={chainId}
        />
      </div>
    </SplitsWrapper>
  );
}