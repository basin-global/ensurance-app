'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import CertificateVerification from './verifications/CertificateVerification'

// Base link style that all verification links will use
const baseVerifyLinkStyle = "text-gray-400 hover:text-gray-200 transition-colors text-[9px]"

// Always show SITUS factory link
const FactoryLink = () => (
  <Link 
    href="https://basescan.org/address/0x67c814835e1920324634fd6da416a0e79c949970#readContract#F3"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className="text-gray-200">SITUS</span>
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

export function BasedOnchain() {
  const pathname = usePathname()
  const isDev = process.env.NODE_ENV === 'development'
  
  // Match any path under /groups/[group]
  const groupMatch = pathname?.match(/^\/groups\/([^\/]+)(?:\/.*)?$/)
  
  // Special case for /pools which is equivalent to /groups/ensurance/all
  const isPoolsPage = pathname === '/pools'
  
  // Match accounts at root level or in subpaths (e.g., /name.group or /name.group/hold)
  const accountMatch = pathname?.match(/^\/([^\/]+\.[^\/]+)(?:\/.*)?$/)
  
  // Match certificate pages - capture chain and tokenId
  const certificateMatch = pathname?.match(/\/certificates\/([^\/]+)\/(\d+)/)
  const isAllCertificates = pathname?.includes('/certificates/all')
  const isOnCertificatesPath = pathname?.includes('/certificates')
  
  // Match asset pages - capture chain, contract, and tokenId
  const assetMatch = pathname?.match(/^\/assets\/([^\/]+)\/([^\/]+)\/([^\/]+)$/)
  
  // Extract group name from group route - first capture group is the group name
  const groupName = groupMatch?.[1] || (isPoolsPage ? 'ensurance' : undefined)

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

  // Check if any verifications are active
  const hasActiveVerifications = (isAllCertificates || (chain && tokenId)) || 
    assetMatch || 
    (groupMatch || isPoolsPage) || 
    accountInfo

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-1 mb-1.5">
          <ShieldCheck className="w-2.5 h-2.5 text-gray-200" />
          <span className="text-[9px] font-mono text-gray-200">based onchain</span>
          <ShieldCheck className="w-2.5 h-2.5 text-gray-200" />
        </div>
        
        <div className="flex flex-col gap-1.5 font-mono text-[9px]">
          {/* SITUS line */}
          <div className="flex justify-center">
            <FactoryLink />
          </div>

          {!hasActiveVerifications && (
            <div className="flex flex-col items-center">
              <span className="text-gray-400">active group/agent will appear here</span>
            </div>
          )}

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
          {(groupMatch || isPoolsPage) && (
            <div className="flex justify-center gap-2">
              <GroupVerification name={groupName} />
            </div>
          )}
          
          {/* Account verification */}
          {accountInfo && (
            <AccountVerification name={accountInfo.name} group={accountInfo.group} />
          )}
        </div>
      </div>
    </div>
  )
}

// Export the base style for child components to use
export { baseVerifyLinkStyle } 