'use client'

import Link from 'next/link'
import { baseVerifyLinkStyle } from '../Verify'

interface Props {
  contractAddress: string
  tokenId: string
  chain?: string
  showTokenbound?: boolean
}

// Ensurance contract addresses
const ENSURANCE_CONTRACTS = {
  base: '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb',
  zora: '0x14b71A8E0C2c4d069cB230CC88a1423736B34096',
  arbitrum: '0xc6e4e6e5a11e70af6334bf3274f4d4c2e0ce3571',
  optimism: '0x5c738cdf228d8c6e8dc68a94b08be7d8958bcccf'
} as const;

// Chain prefixes for Zora URLs
const ZORA_CHAIN_PREFIXES = {
  base: 'base',
  zora: 'zora',
  arbitrum: 'arb',
  optimism: 'oeth'
} as const;

// Chain name mapping for OpenSea
const OPENSEA_CHAIN_NAMES = {
  polygon: 'matic',
  // Add other chain mappings if needed
} as const;

export default function NftLinks({ contractAddress, tokenId, chain = 'base', showTokenbound = false }: Props) {
  // Extract just the contract address if it's a full path
  const cleanContractAddress = contractAddress.split('/').pop() || contractAddress
  const cleanChain = chain.split('/').pop() || chain

  // Get the correct chain name for OpenSea
  const openSeaChain = cleanChain in OPENSEA_CHAIN_NAMES 
    ? OPENSEA_CHAIN_NAMES[cleanChain as keyof typeof OPENSEA_CHAIN_NAMES]
    : cleanChain

  // Check if this is an Ensurance certificate
  const isEnsuranceCertificate = Object.values(ENSURANCE_CONTRACTS)
    .map(addr => addr.toLowerCase())
    .includes(cleanContractAddress.toLowerCase())

  return (
    <div className="flex justify-center gap-2">
      <Link
        href={`https://opensea.io/assets/${openSeaChain}/${cleanContractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className={baseVerifyLinkStyle}
      >
        opensea
      </Link>

      {/* Show Rarible for non-Zora chains */}
      {!(isEnsuranceCertificate && chain === 'zora') && (
        <Link
          href={`https://rarible.com/token/${cleanChain}/${cleanContractAddress}:${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          rarible
        </Link>
      )}

      {/* Show Zora for Ensurance certificates */}
      {isEnsuranceCertificate && chain in ZORA_CHAIN_PREFIXES && (
        <Link
          href={`https://zora.co/collect/${ZORA_CHAIN_PREFIXES[chain as keyof typeof ZORA_CHAIN_PREFIXES]}:${cleanContractAddress}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          zora
        </Link>
      )}

      {showTokenbound && (
        <Link
          href={`https://tokenbound.org/assets/${cleanChain}/${cleanContractAddress}/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          tokenbound
        </Link>
      )}
    </div>
  )
} 