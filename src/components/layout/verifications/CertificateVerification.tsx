'use client'

import Link from 'next/link'
import useSWR from 'swr'
import NftLinks from './NftLinks'
import { baseVerifyLinkStyle } from '../Verify'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Props {
  chain?: string
  tokenId?: string
  showAll?: boolean
}

export default function CertificateVerification({ chain, tokenId, showAll }: Props) {
  // Log component props and state
  console.log('CertificateVerification Props:', {
    chain,
    tokenId,
    showAll,
    url: chain && tokenId ? `/api/certificates/${chain}/${tokenId}` : null
  })

  const { data: certificateData, error } = useSWR(
    chain && tokenId ? `/api/certificates/${chain}/${tokenId}` : null,
    fetcher,
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 
    }
  )

  // Log API response
  console.log('CertificateVerification Data:', {
    certificateData,
    error
  })

  // Show all chains
  if (showAll) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-gray-400">certificates of ensurance</span>
        <div className="flex justify-center gap-2">
          {[
            { name: 'base', url: 'basescan.org', contract: '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb' },
            { name: 'zora', url: 'explorer.zora.energy', contract: '0x14b71A8E0C2c4d069cB230CC88a1423736B34096' },
            { name: 'arbitrum', url: 'arbiscan.io', contract: '0xc6e4e6e5a11e70af6334bf3274f4d4c2e0ce3571' },
            { name: 'optimism', url: 'optimistic.etherscan.io', contract: '0x5c738cdf228d8c6e8dc68a94b08be7d8958bcccf' }
          ].map(({ name, url, contract }) => (
            <Link
              key={name}
              href={`https://${url}/token/${contract}${name === 'zora' ? '?tab=read_write_proxy' : '#readProxyContract'}`}
              target="_blank"
              rel="noopener noreferrer"
              className={baseVerifyLinkStyle}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Show single certificate
  if (!chain || !tokenId || !certificateData?.contract) {
    return null
  }

  const { contract, explorer_url: url } = certificateData
  const isZora = chain === 'zora'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Certificate verification line */}
      <div className="flex justify-center gap-2">
        <Link
          href={`https://${url}/token/${contract}${isZora ? '?tab=read_write_proxy' : '#readProxyContract'}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          ensurance
        </Link>
        <Link
          href={`https://${url}${isZora ? '/token' : '/nft'}/${contract}${isZora ? '/instance' : ''}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          certificate
        </Link>
      </div>

      {/* NFT marketplaces line */}
      <NftLinks 
        contractAddress={contract}
        tokenId={tokenId}
        chain={chain}
        showTokenbound={false}
      />
    </div>
  )
} 