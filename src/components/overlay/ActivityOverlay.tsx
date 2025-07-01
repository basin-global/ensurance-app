'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, TrendingUp, ArrowRightLeft, Send, Flame, Users } from 'lucide-react'
import { useActivityData } from '@/hooks/useActivityData'

interface ActivityItem {
  id: string
  type: 'buy' | 'swap' | 'send' | 'burn'
  user: string
  token: string
  amount: string
  location?: string
  timestamp: Date
  value_usd?: string
}

interface ActivityOverlayProps {
  isVisible?: boolean
  onClose?: () => void
  showCloseButton?: boolean
  maxItems?: number
  updateInterval?: number
}

export default function ActivityOverlay({
  isVisible = true,
  onClose,
  showCloseButton = true,
  maxItems = 5,
  updateInterval = 8000
}: ActivityOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const { activities, isLoading, liveCount } = useActivityData()

  // Cycle through activities
  useEffect(() => {
    if (!activities.length || isMinimized) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(activities.length, maxItems))
    }, updateInterval)

    return () => clearInterval(interval)
  }, [activities.length, maxItems, updateInterval, isMinimized])

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'swap':
        return <ArrowRightLeft className="w-4 h-4 text-blue-400" />
      case 'send':
        return <Send className="w-4 h-4 text-purple-400" />
      case 'burn':
        return <Flame className="w-4 h-4 text-red-400" />
      default:
        return <TrendingUp className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityText = (activity: ActivityItem) => {
    const actionMap = {
      buy: 'bought',
      swap: 'swapped',
      send: 'sent',
      burn: 'burned'
    }
    
    return `${activity.user} ${actionMap[activity.type]} ${activity.amount} ${activity.token}`
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  if (!isVisible || !activities.length) return null

  const currentActivity = activities[currentIndex]

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      {/* Main Activity Card */}
      <div className={`
        pointer-events-auto
        transform transition-all duration-500 ease-out
        ${isMinimized ? 'scale-75 opacity-60' : 'scale-100 opacity-100'}
        ${currentActivity ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="
          bg-black/80 backdrop-blur-lg border border-gray-700/50
          rounded-xl p-4 min-w-[320px] max-w-[380px]
          shadow-2xl ring-1 ring-white/10
          transition-all duration-300 hover:bg-black/90
        ">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                Live Activity
              </span>
              {liveCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <Users className="w-3 h-3" />
                  <span>{liveCount}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Minimize/Maximize Button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="
                  p-1 rounded-md hover:bg-gray-700/50 
                  transition-colors text-gray-400 hover:text-white
                "
              >
                <div className={`w-3 h-3 border border-current transition-transform ${isMinimized ? 'rotate-45' : ''}`} />
              </button>
              
              {/* Close Button */}
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="
                    p-1 rounded-md hover:bg-gray-700/50 
                    transition-colors text-gray-400 hover:text-white
                  "
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Activity Content */}
          {!isMinimized && currentActivity && (
            <div className="space-y-3">
              {/* Main Activity */}
              <div className="flex items-start gap-3">
                <div className="
                  flex-shrink-0 w-8 h-8 rounded-full 
                  bg-gradient-to-br from-blue-500/20 to-purple-500/20
                  border border-gray-600/50 flex items-center justify-center
                ">
                  {getActivityIcon(currentActivity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium leading-relaxed">
                    {getActivityText(currentActivity)}
                  </p>
                  
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {currentActivity.location && (
                        <span>📍 {currentActivity.location}</span>
                      )}
                      <span>{formatTimeAgo(currentActivity.timestamp)}</span>
                    </div>
                    
                    {currentActivity.value_usd && (
                      <span className="text-xs text-green-400 font-medium">
                        ~${currentActivity.value_usd}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(activities.length, maxItems) }).map((_, index) => (
                    <div
                      key={index}
                      className={`
                        w-2 h-1 rounded-full transition-all duration-300
                        ${index === currentIndex ? 'bg-blue-400 w-4' : 'bg-gray-600'}
                      `}
                    />
                  ))}
                </div>
                
                <div className="text-xs text-gray-500">
                  {currentIndex + 1} of {Math.min(activities.length, maxItems)}
                </div>
              </div>
            </div>
          )}

          {/* Minimized State */}
          {isMinimized && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">{activities.length} recent activities</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Prompt (appears periodically) */}
      {!isMinimized && currentActivity && (
        <div className="
          mt-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 
          backdrop-blur-sm border border-blue-400/30 rounded-lg p-3
          pointer-events-auto animate-pulse
        ">
          <p className="text-xs text-blue-200 text-center">
            Join {activities.length}+ others securing what matters
          </p>
        </div>
      )}
    </div>
  )
}