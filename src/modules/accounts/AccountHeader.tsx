'use client'

import { toast } from 'react-toastify'
import SingleAccountImage from './SingleAccountImage'

interface AccountHeaderProps {
  accountName: string
  tokenId: number
  tbaAddress: string
  groupName: string
}

export default function AccountHeader({ accountName, tokenId, tbaAddress, groupName }: AccountHeaderProps) {
  return (
    <div className="relative group/main py-8">
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
          <h2 className="text-3xl font-bold text-white">
            {accountName}
          </h2>
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
  )
} 