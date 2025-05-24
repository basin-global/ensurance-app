'use client'

import GroupVerification from './GroupVerification'
import AccountVerification from './AccountVerification'
import GeneralCertificateVerification from './GeneralCertificateVerification'
import SpecificCertificateVerification from './SpecificCertificateVerification'
import { ShieldCheck } from 'lucide-react'

interface Props {
  type: 'group' | 'account' | 'general' | 'specific'
  name: string
  group?: string
  contractAddress?: string
  tokenId?: string
}

export default function VerificationSection({ type, name, group, contractAddress, tokenId }: Props) {
  return (
    <div className="w-full border-t border-gray-800 py-4">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="text-[13px] font-mono text-white font-medium">based onchain</span>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="text-[12px]">
              {type === 'group' ? (
                <GroupVerification name={name} />
              ) : type === 'account' ? (
                <AccountVerification name={name} group={group!} />
              ) : type === 'specific' ? (
                <SpecificCertificateVerification 
                  contractAddress={contractAddress!} 
                  tokenId={tokenId}
                />
              ) : (
                <GeneralCertificateVerification contractAddress={contractAddress!} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 