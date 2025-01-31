'use client'

import { toast } from 'react-toastify'
import SingleAccountImage from './SingleAccountImage'

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
  // Decode the account name if it's URL encoded
  const decodedAccountName = decodeURIComponent(accountName)

  // Format display name for pools
  const formattedDisplayName = isPool && displayName 
    ? `${displayName} Ensurance Pool`
    : decodedAccountName

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
            {isAgent && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800/80 text-purple-300/50 font-mono ml-2 translate-y-[2px]">
                AGENT
              </span>
            )}
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