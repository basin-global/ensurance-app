import { TokenDisplayInfo } from './collect'
import Image from 'next/image'
import Link from 'next/link'
import { formatUnits } from 'viem'
import { CONTRACTS, MAX_SUPPLY_OPEN_EDITION } from './config'
import { cn } from '@/lib/utils'

// Status dot component
const StatusDot = ({ active }: { active: boolean }) => {
  const statusDotClasses = "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"
  
  return (
    <span className={cn(
      statusDotClasses,
      active 
        ? "bg-green-500 after:bg-green-500/50" 
        : "bg-red-500 after:bg-red-500/50"
    )} />
  )
}

interface SpecificListProps {
  tokens: TokenDisplayInfo[]
  tokenMetadata: Record<string, any>
}

const FALLBACK_IMAGE = '/assets/no-image-found.png'

export default function SpecificList({ tokens, tokenMetadata }: SpecificListProps) {
  if (!tokens.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">None found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400">
            <th className="pb-4 font-medium w-[40%]">token</th>
            <th className="pb-4 font-medium w-[20%]">issued</th>
            <th className="pb-4 font-medium text-right w-[20%]">$</th>
            <th className="pb-4 font-medium text-right w-[20%]">status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {tokens.map((token) => {
            const metadata = tokenMetadata[token.tokenURI]
            const metadataError = metadata?.error
            let imageUrl = FALLBACK_IMAGE

            if (metadata && !metadataError && metadata.image) {
              imageUrl = metadata.image.startsWith('ipfs://') 
                ? metadata.image.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/') + `?t=${Date.now()}`
                : metadata.image + `?t=${Date.now()}`
            }

            return (
              <tr key={token.tokenURI} className="hover:bg-gray-900/30 transition-colors">
                <td className="py-4">
                  <Link href={`/specific/${CONTRACTS.specific}/${token.tokenURI.split('/').pop()}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <Image
                          src={imageUrl}
                          alt={metadata?.name || 'Token'}
                          width={48}
                          height={48}
                          className="object-cover"
                          unoptimized={true}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            img.src = FALLBACK_IMAGE
                          }}
                        />
                      </div>
                      <div className="font-medium text-white">
                        {metadata && !metadataError ? (
                          <>
                            {metadata.name.split('|')[0].trim()}
                            {metadata.name.includes('|') && (
                              <div className="text-sm text-gray-400">
                                {metadata.name.split('|')[1].trim()}
                              </div>
                            )}
                          </>
                        ) : 'Unnamed Token'}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="py-4">
                  <div className="font-medium text-white">
                    {token.totalMinted.toString()} / {token.maxSupply >= MAX_SUPPLY_OPEN_EDITION - BigInt(1) ? '∞' : token.maxSupply.toString()}
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="font-medium text-white">
                    {token.salesConfig?.pricePerToken 
                      ? `$${formatUnits(token.salesConfig.pricePerToken, 6)} ea`
                      : 'N/A'}
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="flex justify-end">
                    <StatusDot active={token.primaryMintActive || false} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
} 