'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import VerificationSection from '@/components/layout/verifications/VerificationSection'
import { SplitsWrapper } from '@/providers/splits-provider'
import Details from '@/modules/specific/Details'

export default function TokenPage({
  params
}: {
  params: { contract: string; tokenId: string }
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader 
        title="specific ensurance"
        showSearch={false}
        showBackArrow={true}
        backLink="/specific"
      />
      
      <div className="container mx-auto px-4 flex-1 pb-12">
        <SplitsWrapper>
          <Details
            contractAddress={params.contract as `0x${string}`}
            tokenId={params.tokenId}
          />
        </SplitsWrapper>
      </div>

      <VerificationSection 
        type="specific"
        name=""
        contractAddress={params.contract}
      />
    </div>
  )
}
