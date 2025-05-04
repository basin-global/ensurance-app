'use client'

import { toast } from 'react-toastify'
import SingleAccountImage from './SingleAccountImage'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import SITUS_ABI from '@/abi/SitusOG.json'
import type { Address } from 'viem'

interface Group {
  group_name: string
  contract_address: string
}

interface AccountHeaderProps {
  accountName: string
  tokenId: number
  tbaAddress: string
  groupName: string
  isAgent?: boolean
  displayName?: string | null
  isPool?: boolean
}

export default function AccountHeader({ 
  accountName, 
  tokenId, 
  tbaAddress, 
  groupName,
  isAgent,
  displayName,
  isPool 
}: AccountHeaderProps) {
  const { user } = usePrivy()
  const [isOwner, setIsOwner] = useState(false)
  const statusDotClasses = "w-3 h-3 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse"

  // Decode the account name if it's URL encoded
  const decodedAccountName = decodeURIComponent(accountName)

  // Format display name for pools
  const formattedDisplayName = isPool && displayName 
    ? `${displayName.toLowerCase()} ensurance`
    : decodedAccountName

  useEffect(() => {
    async function checkOwnership() {
      if (!user?.wallet?.address) return

      try {
        const client = createPublicClient({
          chain: base,
          transport: http()
        })

        // Get the contract address from the group name
        const factoryResponse = await fetch('/api/groups')
        const groups = (await factoryResponse.json()) as Group[]
        const group = groups.find(g => g.group_name === `.${groupName}`)
        
        if (!group?.contract_address) {
          console.warn('Group contract address not found')
          return
        }

        const owner = await client.readContract({
          address: group.contract_address as `0x${string}`,
          abi: SITUS_ABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)]
        }) as Address

        setIsOwner(owner.toLowerCase() === user.wallet.address.toLowerCase())
      } catch (error) {
        console.error('Error checking ownership:', error)
      }
    }

    checkOwnership()
  }, [user?.wallet?.address, tokenId, groupName])

  return (
    <div className="relative group/main">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gray-800 rounded-full">
          <SingleAccountImage 
            tokenId={tokenId}
            groupName={groupName}
            variant="circle"
            className="bg-gray-800"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-white">
              {formattedDisplayName}
            </h2>
            <div className="flex items-center gap-3">
              {isAgent && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800/80 text-purple-300/50 font-mono ml-2 translate-y-[2px]">
                  AGENT
                </span>
              )}
              {isOwner && (
                <span className={cn(
                  statusDotClasses,
                  "bg-green-500 after:bg-green-500/50 ml-1"
                )} />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            {/* Account name on hover - only for pools */}
            {isPool && displayName && (
              <div className="text-sm font-mono text-gray-500 opacity-0 group-hover/main:opacity-70 transition-opacity duration-300 delay-300">
                {decodedAccountName}
              </div>
            )}
            {/* TBA address with copy functionality */}
            <div 
              className="cursor-pointer text-sm font-mono text-gray-500 opacity-0 group-hover/main:opacity-70 transition-opacity duration-300 delay-300 hover:text-gray-300"
              onClick={() => {
                navigator.clipboard.writeText(tbaAddress)
                  .then(() => toast.success('Account address copied to clipboard!', {
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                  }))
                  .catch(() => toast.error('Failed to copy address'))
              }}
            >
              {tbaAddress}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 