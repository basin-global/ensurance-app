'use client'

import Link from 'next/link'
import { baseVerifyLinkStyle } from '../BasedOnchain'
import { getEnsuranceContractForChain } from '@/modules/certificates/specific/config/ensurance'
import NftLinks from './NftLinks'

// Chain-specific configuration
const CHAIN_CONFIG = {
  base: { 
    url: 'basescan.org', 
    suffix: '#readProxyContract',
    contract: '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb'
  },
  zora: { 
    url: 'explorer.zora.energy', 
    suffix: '?tab=read_write_proxy',
    contract: '0x14b71A8E0C2c4d069cB230CC88a1423736B34096'
  },
  arbitrum: { 
    url: 'arbiscan.io', 
    suffix: '#readProxyContract',
    contract: '0xc6e4e6e5a11e70af6334bf3274f4d4c2e0ce3571'
  },
  optimism: { 
    url: 'optimistic.etherscan.io', 
    suffix: '#readProxyContract',
    contract: '0x5c738cdf228d8c6e8dc68a94b08be7d8958bcccf'
  }
} as const;

interface Props {
  chain?: string
  tokenId?: string
  showAll?: boolean
}

export default function CertificateVerification({ chain, tokenId, showAll }: Props) {
  // Show all chains
  if (showAll) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-gray-400">certificates of ensurance</span>
        <div className="flex justify-center gap-2">
          {Object.entries(CHAIN_CONFIG).map(([name, { url, suffix, contract }]) => (
            <Link
              key={name}
              href={`https://${url}/token/${contract}${suffix}`}
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
  if (!chain || !tokenId) {
    return null
  }

  const contract = getEnsuranceContractForChain(chain)
  if (!contract) return null

  const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]
  if (!chainConfig) return null

  const { url, suffix } = chainConfig
  const isZora = chain === 'zora'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Certificate verification line */}
      <div className="flex justify-center gap-2">
        <Link
          href={`https://${url}${isZora ? '/token' : '/nft'}/${contract}${isZora ? '/instance' : ''}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          certificate
        </Link>
        <span className="text-gray-400">of</span>
        <Link
          href={`https://${url}/token/${contract}${suffix}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          ensurance
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