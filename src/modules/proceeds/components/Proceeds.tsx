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
        <a 
          href={`/proceeds?address=${payout_recipient}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group cursor-pointer block"
        >
          <TotalProceedsBar 
            address={payout_recipient}
            title="ensurance proceeds"
            description="perpetual funding for what matters"
          />
        </a>

        {/* Grid Container for Initial Supply and Provenance */}
        {(initial_supply || provenance) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initial Supply Section */}
            {initial_supply && (
              <a
                href={`/proceeds?address=${initial_supply}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer block"
              >
                <TotalProceedsBar 
                  address={initial_supply}
                  title="initial supply"
                  description="certificate distribution at launch"
                />
              </a>
            )}

            {/* Provenance Section */}
            {provenance && (
              <a
                href={`/proceeds?address=${provenance}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer block"
              >
                <TotalProceedsBar 
                  address={provenance}
                  title="provenance"
                  description="policy creator allocation"
                />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 