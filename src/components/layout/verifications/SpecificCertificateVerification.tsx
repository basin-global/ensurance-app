'use client'

// TODO: This component will be reimplemented for specific ensurance certificates
// Currently contains legacy verification code that will be updated
// to handle Base chain specific functionality in the future

import Link from 'next/link'
import NftLinks from './NftLinks'

interface Props {
  tokenId?: string
  contractAddress: string
}

export default function SpecificCertificateVerification({ tokenId, contractAddress }: Props) {
  if (!tokenId) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Certificate verification line */}
      <div className="flex justify-center gap-2">
        <Link
          href={`https://basescan.org/nft/${contractAddress}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          certificate
        </Link>
        <span className="text-gray-400">of</span>
        <Link
          href={`https://basescan.org/token/${contractAddress}#readProxyContract`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          ensurance
        </Link>
      </div>

      {/* NFT marketplaces line */}
      <NftLinks 
        contractAddress={contractAddress}
        tokenId={tokenId}
        chain="base"
        showTokenbound={false}
      />
    </div>
  )
} 