'use client'

import Link from 'next/link'

interface Props {
  contractAddress: string
}

export default function GeneralCertificateVerification({ contractAddress }: Props) {
  return (
    <div className="text-[12px] flex justify-center gap-2">
      <Link
        href={`https://zora.co/coin/base:${contractAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white transition-colors"
      >
        zora
      </Link>
      <Link
        href={`https://basescan.org/token/${contractAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white transition-colors"
      >
        basescan
      </Link>
    </div>
  )
} 