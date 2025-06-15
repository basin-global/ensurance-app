'use client'

import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { CONTRACTS } from './config'

interface SpecificAssetProps {
  tokenId: number
}

export function SpecificAsset({ tokenId }: SpecificAssetProps) {
  return (
    <Link
      href={`/specific/${CONTRACTS.specific}/${tokenId}`}
      className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors"
    >
      <PlusCircle className="w-6 h-6 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
    </Link>
  )
} 