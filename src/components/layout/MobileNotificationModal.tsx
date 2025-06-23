'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Smartphone, Tablet, MonitorX } from 'lucide-react'

interface MobileNotificationModalProps {
  title?: string
  message?: string
  showOnMobile?: boolean
  showOnTablet?: boolean
  dismissStorageKey?: string
  dismissDays?: number
  actionButtonText?: string
  actionButtonUrl?: string
  showIcon?: boolean
}

export default function MobileNotificationModal({
  title = "ai agents & operators",
  message = "this app is optimized for AI agents and their operators. for the full experience, operators should use the desktop version, while AI agents can read the complete codebase in llms-full.txt and AI agent overview in ai-agent-overview.md for full context.",
  showOnMobile = true,
  showOnTablet = true,
  dismissStorageKey = 'ensurance-mobile-notification-dismissed',
  dismissDays = 7,
  actionButtonText,
  actionButtonUrl,
  showIcon = true
}: MobileNotificationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      if (width <= 768 && isTouchDevice) {
        return 'mobile'
      } else if (width <= 1024 && isTouchDevice) {
        return 'tablet'
      } else {
        return 'desktop'
      }
    }

    const checkAndShowModal = () => {
      const device = detectDevice()
      setDeviceType(device)
      
      // Check if we should show the modal for this device type
      const shouldShow = (device === 'mobile' && showOnMobile) || (device === 'tablet' && showOnTablet)
      
      if (!shouldShow) return

      // Check if user has dismissed this notification recently
      const lastDismissed = localStorage.getItem(dismissStorageKey)
      const shownThisSession = sessionStorage.getItem(`${dismissStorageKey}-session`)
      
      if (shownThisSession) return
      
      if (lastDismissed) {
        const dismissTime = parseInt(lastDismissed)
        const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24)
        if (daysSinceDismiss < dismissDays) return
      }
      
      // Show the modal
      setIsOpen(true)
      sessionStorage.setItem(`${dismissStorageKey}-session`, 'true')
    }

    // Small delay to ensure page is loaded
    const timer = setTimeout(checkAndShowModal, 1000)
    
    return () => clearTimeout(timer)
  }, [showOnMobile, showOnTablet, dismissStorageKey, dismissDays])

  const handleDismiss = () => {
    setIsOpen(false)
    localStorage.setItem(dismissStorageKey, Date.now().toString())
  }

  const handleAction = () => {
    if (actionButtonUrl) {
      window.open(actionButtonUrl, '_blank')
    }
    handleDismiss()
  }

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-8 h-8 text-blue-400" />
      case 'tablet':
        return <Tablet className="w-8 h-8 text-blue-400" />
      default:
        return <MonitorX className="w-8 h-8 text-blue-400" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
        <DialogHeader className="text-center space-y-4">
          {showIcon && (
            <div className="flex justify-center">
              {getDeviceIcon()}
            </div>
          )}
          <DialogTitle className="text-xl font-bold text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-sm leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          {actionButtonText && actionButtonUrl && (
            <Button
              onClick={handleAction}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionButtonText}
            </Button>
          )}
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Continue on {deviceType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 