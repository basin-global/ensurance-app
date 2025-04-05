'use client'

import { useRouter } from 'next/navigation'
import { TotalProceedsBar } from './TotalProceedsBar'

interface ProceedsProps {
  payout_recipient: string
  initial_supply?: string
  provenance?: string
  variant?: 'general' | 'specific'
}

export function Proceeds({ 
  payout_recipient, 
  initial_supply,
  provenance, 
  variant = 'general' 
}: ProceedsProps) {
  const router = useRouter()

  const handleProceedsClick = () => {
    router.push(`/proceeds?address=${payout_recipient}`)
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">FUNDING WHAT MATTERS</h2>
      
      <div className="space-y-6">
        {/* Proceeds Payout Section - Always Full Width */}
        <div 
          onClick={handleProceedsClick}
          className="group cursor-pointer"
        >
          <TotalProceedsBar 
            address={payout_recipient}
            title="ensurance proceeds"
            description="perpetual funding for natural capital"
          />
        </div>

        {/* Grid Container for Initial Supply and Provenance */}
        {(initial_supply || provenance) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initial Supply Section */}
            {initial_supply && (
              <TotalProceedsBar 
                address={initial_supply}
                title="initial supply"
                description="certificate distribution at launch"
              />
            )}

            {/* Provenance Section */}
            {provenance && (
              <TotalProceedsBar 
                address={provenance}
                title="provenance"
                description="policy creator allocation"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
} 