'use client'

import { useRouter } from 'next/navigation'
import { TotalProceedsBar } from './TotalProceedsBar'
import { useEffect, useState } from 'react'
import { publicClient } from '@/modules/specific/config'
import ZORA_ERC20_MINTER_ABI from '@/abi/ZoraERC20Minter.json'
import { CONTRACTS } from '@/modules/specific/config'
import { SplitsWrapper } from '@/providers/splits-provider'

interface ProceedsProps {
  payout_recipient: string
  initial_supply?: string
  provenance?: string
  variant?: 'general' | 'specific'
  tokenId?: string
}

export function Proceeds({ 
  payout_recipient, 
  initial_supply,
  provenance, 
  variant = 'general',
  tokenId
}: ProceedsProps) {
  const router = useRouter()
  const [recipientAddress, setRecipientAddress] = useState<string>(payout_recipient)
  const [isLoading, setIsLoading] = useState(false)
  const [recipientCounts, setRecipientCounts] = useState({ direct: 0, indirect: 0 });

  // Fetch funds recipient for specific variant
  useEffect(() => {
    if (variant === 'specific' && tokenId) {
      const fetchFundsRecipient = async () => {
        try {
          setIsLoading(true)
          const salesConfig = await publicClient.readContract({
            address: CONTRACTS.erc20Minter,
            abi: ZORA_ERC20_MINTER_ABI,
            functionName: 'sale',
            args: [CONTRACTS.specific, BigInt(tokenId)]
          }) as any

          console.log('Sales config:', salesConfig)
          const fundsRecipient = salesConfig.fundsRecipient
          console.log('Funds recipient:', fundsRecipient)
          
          if (fundsRecipient && typeof fundsRecipient === 'string') {
            setRecipientAddress(fundsRecipient)
          } else {
            console.warn('Invalid funds recipient from contract:', fundsRecipient)
            setRecipientAddress(payout_recipient)
          }
        } catch (error) {
          console.error('Error fetching funds recipient:', error)
          setRecipientAddress(payout_recipient)
        } finally {
          setIsLoading(false)
        }
      }

      fetchFundsRecipient()
    }
  }, [variant, tokenId, payout_recipient])

  // Validate address before rendering
  const isValidAddress = (address: string) => {
    return address && typeof address === 'string' && address.length === 42 && address.startsWith('0x')
  }

  // Render specific variant
  if (variant === 'specific') {
    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">ENSURANCE PROCEEDS</h2>
            <p className="text-sm text-gray-400">perpetual funding for what matters</p>
          </div>
          <div className="w-full h-12 rounded-full overflow-hidden bg-gray-800/50 animate-pulse" />
        </div>
      )
    }

    if (!isValidAddress(recipientAddress)) {
      console.warn('Invalid recipient address:', recipientAddress)
      return (
        <div className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">ENSURANCE PROCEEDS</h2>
            <p className="text-sm text-gray-400">perpetual funding for what matters</p>
          </div>
          <div className="w-full h-12 rounded-full overflow-hidden bg-gray-800/50">
            <div className="w-full h-full bg-gray-700/70" />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">ENSURANCE PROCEEDS</h2>
          <p className="text-sm text-gray-400">perpetual funding for what matters</p>
        </div>

        {/* Beneficiaries Count Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">beneficiaries</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">direct: {recipientCounts.direct}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">indirect: {recipientCounts.indirect}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">total: {recipientCounts.direct + recipientCounts.indirect}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <SplitsWrapper>
            <TotalProceedsBar 
              address={recipientAddress}
              onRecipientsUpdate={setRecipientCounts}
            />
          </SplitsWrapper>
        </div>
      </div>
    )
  }

  // Render general variant
  if (!isValidAddress(recipientAddress)) {
    console.warn('Invalid recipient address:', recipientAddress)
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">ENSURANCE PROCEEDS</h2>
        <p className="text-sm text-gray-400">perpetual funding for what matters</p>
      </div>

      {/* Beneficiaries Count Grid */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">beneficiaries</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">direct: {recipientCounts.direct}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">indirect: {recipientCounts.indirect}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">total: {recipientCounts.direct + recipientCounts.indirect}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Proceeds Payout Section - Always Full Width */}
        <SplitsWrapper>
          <TotalProceedsBar 
            address={recipientAddress}
            onRecipientsUpdate={setRecipientCounts}
          />
        </SplitsWrapper>

        {/* Grid Container for Initial Supply and Provenance */}
        {(initial_supply || provenance) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initial Supply Section */}
            {initial_supply && isValidAddress(initial_supply) && (
              <SplitsWrapper>
                <TotalProceedsBar 
                  address={initial_supply}
                  onRecipientsUpdate={setRecipientCounts}
                />
              </SplitsWrapper>
            )}

            {/* Provenance Section */}
            {provenance && isValidAddress(provenance) && (
              <SplitsWrapper>
                <TotalProceedsBar 
                  address={provenance}
                  onRecipientsUpdate={setRecipientCounts}
                />
              </SplitsWrapper>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 