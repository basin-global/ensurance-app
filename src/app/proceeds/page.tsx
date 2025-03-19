'use client';

import { FlowViewer } from '@/modules/proceeds/flows/FlowViewer';
import { SplitsWrapper } from '@/modules/proceeds/splits-provider';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ProceedsPage() {
  const defaultAddress = '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e';
  const chainId = 8453; // Base chain ID

  return (
    <SplitsWrapper>
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="space-y-4">
            <PageHeader
              title="ensurance proceeds"
              description="perpetual funding for natural capital & the people who steward it"
              showSearch={false}
            />
            <FlowViewer 
              address={defaultAddress}
              chainId={chainId}
            />
          </div>
        </div>
      </div>
    </SplitsWrapper>
  );
}