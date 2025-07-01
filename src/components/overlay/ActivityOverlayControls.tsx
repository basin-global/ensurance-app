'use client'

import React from 'react'
import { Eye, EyeOff, Activity } from 'lucide-react'
import { useActivityOverlay } from '@/providers/activity-overlay-provider'

export default function ActivityOverlayControls() {
  const { isVisible, showOverlay, hideOverlay, toggleOverlay } = useActivityOverlay()

  return (
    <div className="fixed top-20 right-6 z-40 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-gray-300">Activity Overlay</span>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={toggleOverlay}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
            transition-colors duration-200
            ${isVisible 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
            }
          `}
        >
          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isVisible ? 'Visible' : 'Hidden'}
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Demo controls - remove in production
      </div>
    </div>
  )
}