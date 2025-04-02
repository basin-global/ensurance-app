'use client'

import Link from 'next/link'

interface Props {
  contractAddress: string
  tokenId: string
  chain?: string
  showTokenbound?: boolean
}

export default function NftLinks({ contractAddress, tokenId, chain = 'base', showTokenbound = false }: Props) {
  return (
    <div className="flex justify-center gap-2">
      <Link
        href={`https://opensea.io/assets/${chain}/${contractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white transition-colors"
      >
        opensea
      </Link>

      <Link
        href={`https://rarible.com/token/${chain}/${contractAddress}:${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white transition-colors"
      >
        rarible
      </Link>

      {showTokenbound && (
        <Link
          href={`https://tokenbound.org/assets/${chain}/${contractAddress}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          tokenbound
        </Link>
      )}
    </div>
  )
} 