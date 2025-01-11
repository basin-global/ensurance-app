'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useSite } from '@/contexts/site-context'
import { isSite } from '@/config/routes'
import CertificateVerification from './verifications/CertificateVerification'

// Base link style that all verification links will use
const baseVerifyLinkStyle = "text-gray-400 hover:text-gray-200 transition-colors text-[9px]"

// Always show SITUS factory link
const FactoryLink = () => (
  <Link 
    href="https://basescan.org/address/0x67c814835e1920324634fd6da416a0e79c949970#readContract#F3"
    target="_blank"
    rel="noopener noreferrer"
    className={baseVerifyLinkStyle}
  >
    SITUS
  </Link>
)

// Dynamically import verification components
const GroupVerification = dynamic(() => import('./verifications/GroupVerification'), {
  ssr: false,
  loading: () => null
})

const AccountVerification = dynamic(() => import('./verifications/AccountVerification'), {
  ssr: false,
  loading: () => null
})

const NftLinks = dynamic(() => import('./verifications/NftLinks'), {
  ssr: false,
  loading: () => null
})

export function Verify() {
  const pathname = usePathname()
  const site = useSite()
  const isDev = process.env.NODE_ENV === 'development'
  
  // Match any path under /groups/[group]
  const groupMatch = pathname?.match(/^\/(?:site-onchain-agents\/)?groups\/([^\/]+)(?:\/.*)?$/)
  
  // Only match accounts at root level with a dot (e.g., /name.group)
  const accountMatch = pathname?.match(/^\/(?:site-onchain-agents\/)?([^\/]+\.[^\/]+)$/)
  
  // Match certificate pages - capture chain and tokenId
  const certificateMatch = pathname?.match(/\/certificates\/([^\/]+)\/(\d+)/)
  const isAllCertificates = pathname?.includes('/certificates/all')
  const isOnCertificatesPath = pathname?.includes('/certificates')
  
  // Match asset pages - capture chain, contract, and tokenId
  const assetMatch = pathname?.match(/^\/(?:site-onchain-agents\/)?assets\/([^\/]+)\/([^\/]+)\/([^\/]+)$/)
  
  // Extract group name from group route - first capture group is the group name
  const groupName = groupMatch?.[1]

  // Extract account info only if we have an account match
  const accountInfo = accountMatch?.[1] ? {
    name: accountMatch[1],
    group: accountMatch[1].split('.')[1]
  } : null

  // Extract certificate info from match groups
  const chain = certificateMatch?.[1]
  const tokenId = certificateMatch?.[2]
  
  // Extract asset info from match groups
  const assetChain = assetMatch?.[1]
  const assetContract = assetMatch?.[2]
  const assetTokenId = assetMatch?.[3]

  // Show certificates verification when on certificates path
  const showCertificates = isOnCertificatesPath

  // Log detailed path matching info
  console.log('Path Matching:', {
    rawPathname: pathname,
    certificateMatch,
    isAllCertificates,
    isOnCertificatesPath,
    chain,
    tokenId,
    showCertificates,
    isSingleCertificate: Boolean(chain && tokenId)
  })

  return (
    <div className="mt-4 pt-3 border-t border-gray-800/30">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-1 mb-1.5">
          <ShieldCheck className="w-2.5 h-2.5 text-gray-200" />
          <span className="text-[9px] font-mono text-gray-200">based onchain</span>
          <ShieldCheck className="w-2.5 h-2.5 text-gray-200" />
        </div>
        
        <div className="flex flex-col gap-1.5 font-mono text-[9px]">
          {/* Certificates line */}
          {(isAllCertificates || (chain && tokenId)) && (
            <div className="flex justify-center gap-2">
              <CertificateVerification 
                chain={chain}
                tokenId={tokenId}
                showAll={isAllCertificates}
              />
            </div>
          )}
          
          {/* Asset verification */}
          {assetMatch && (
            <div className="flex justify-center gap-2">
              <NftLinks 
                contractAddress={assetContract}
                tokenId={assetTokenId}
                chain={assetChain}
                showTokenbound={false}
              />
            </div>
          )}
          
          {/* Group verification */}
          {groupMatch && (
            <div className="flex justify-center gap-2">
              <GroupVerification name={groupName} />
            </div>
          )}
          
          {/* Account verification (includes group and tokenbound) */}
          {accountInfo && (
            <AccountVerification name={accountInfo.name} group={accountInfo.group} />
          )}
          
          {/* Factory line */}
          <FactoryLink />
        </div>
      </div>
    </div>
  )
}

// Export the base style for child components to use
export { baseVerifyLinkStyle } 