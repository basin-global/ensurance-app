'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import ActivityOverlay from '@/components/overlay/ActivityOverlay'

interface ActivityOverlayContextType {
  isVisible: boolean
  showOverlay: () => void
  hideOverlay: () => void
  toggleOverlay: () => void
}

const ActivityOverlayContext = createContext<ActivityOverlayContextType | undefined>(undefined)

export function useActivityOverlay() {
  const context = useContext(ActivityOverlayContext)
  if (!context) {
    throw new Error('useActivityOverlay must be used within an ActivityOverlayProvider')
  }
  return context
}

interface ActivityOverlayProviderProps {
  children: React.ReactNode
  defaultVisible?: boolean
  enableLocalStorage?: boolean
}

export function ActivityOverlayProvider({ 
  children, 
  defaultVisible = true,
  enableLocalStorage = true
}: ActivityOverlayProviderProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible)

  // Load saved preference from localStorage
  useEffect(() => {
    if (!enableLocalStorage) return
    
    try {
      const saved = localStorage.getItem('ensurance-activity-overlay-visible')
      if (saved !== null) {
        setIsVisible(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load overlay preference:', error)
    }
  }, [enableLocalStorage])

  // Save preference to localStorage
  useEffect(() => {
    if (!enableLocalStorage) return
    
    try {
      localStorage.setItem('ensurance-activity-overlay-visible', JSON.stringify(isVisible))
    } catch (error) {
      console.warn('Failed to save overlay preference:', error)
    }
  }, [isVisible, enableLocalStorage])

  const showOverlay = () => setIsVisible(true)
  const hideOverlay = () => setIsVisible(false)
  const toggleOverlay = () => setIsVisible(prev => !prev)

  const contextValue: ActivityOverlayContextType = {
    isVisible,
    showOverlay,
    hideOverlay,
    toggleOverlay
  }

  return (
    <ActivityOverlayContext.Provider value={contextValue}>
      {children}
      <ActivityOverlay 
        isVisible={isVisible} 
        onClose={hideOverlay}
        showCloseButton={true}
      />
    </ActivityOverlayContext.Provider>
  )
}