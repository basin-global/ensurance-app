'use client'

import React from 'react'

interface OverviewTabProps {
  description?: string
  tbaAddress: string
  isOwner?: boolean
}

export default function OverviewTab({ description, tbaAddress, isOwner }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Description */}
      {description && (
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500">About</div>
          <p className="text-sm text-gray-400">
            {description}
          </p>
        </div>
      )}

      {/* Asset Value */}
      <div className="space-y-1.5">
        <div className="text-xs text-gray-500">Total Asset Value</div>
        <div className="text-xl text-gray-300">Coming soon...</div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500">Certificates</div>
          <div className="text-gray-300">--</div>
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500">Reputation</div>
          <div className="text-gray-300">--</div>
        </div>
      </div>
    </div>
  )
} 