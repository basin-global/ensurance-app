'use client'

import { TotalProceedsBar } from './TotalProceedsBar'

interface ProceedsProps {
  payout_recipient: string
  provenance?: string
}

export function Proceeds({ payout_recipient, provenance }: ProceedsProps) {
  return (
    <div className="space-y-8">
      {/* Funding What Matters Section */}
      <TotalProceedsBar 
        address={payout_recipient}
        title="FUNDING WHAT MATTERS"
        description="ensurance proceeds funds what matters. all proceeds fund these recipients"
      />

      {/* Provenance Section - Only show if provenance exists */}
      {provenance && (
        <TotalProceedsBar 
          address={provenance}
          title="PROVENANCE"
          description="policy creator received 1M certificates"
        />
      )}
    </div>
  )
} 