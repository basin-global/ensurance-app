'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import type { Address } from 'viem'
import { cn } from '@/lib/utils'
import SITUS_ABI from '@/abi/SitusOG.json'

interface Props {
  name: string
  group: string
  tokenId: number
}

export default function OperatorVerification({ name, group, tokenId }: Props) {
  const { user } = usePrivy()
  const [isOperator, setIsOperator] = useState(false)
  const [operatorAddress, setOperatorAddress] = useState<Address | null>(null)
  const statusDotClasses = "w-1.5 h-1.5 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse mt-[1px]"

  useEffect(() => {
    async function checkOperator() {
      try {
        const client = createPublicClient({
          chain: base,
          transport: http()
        })

        // Get the contract address from the group name
        const factoryResponse = await fetch('/api/groups')
        const groups = await factoryResponse.json()
        const groupData = groups.find((g: any) => g.group_name === `.${group}`)
        
        if (!groupData?.contract_address) {
          console.warn('Group contract address not found')
          return
        }

        const operator = await client.readContract({
          address: groupData.contract_address as `0x${string}`,
          abi: SITUS_ABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)]
        }) as Address

        setOperatorAddress(operator)
        if (user?.wallet?.address) {
          setIsOperator(operator.toLowerCase() === user.wallet.address.toLowerCase())
        }
      } catch (error) {
        console.error('Error checking operator:', error)
      }
    }

    checkOperator()
  }, [user?.wallet?.address, tokenId, group])

  if (!operatorAddress) return null

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`https://basescan.org/address/${operatorAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white transition-colors"
      >
        operator
      </Link>
      {isOperator && (
        <span className={cn(
          statusDotClasses,
          "bg-green-500 after:bg-green-500/50"
        )} />
      )}
    </div>
  )
} 