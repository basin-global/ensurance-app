'use client'

import React, { useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import SwarmAccountImage from '@/modules/accounts/SwarmAccountImage'
import Link from 'next/link'
import { useSite } from '@/contexts/site-context'

interface SwarmItem {
  id: number
  tokenId: string | number
  groupName: string
  x: number
  y: number
  vx: number
  vy: number
  title: string
  description: string
}

interface ImageSwarmProps {
  images: {
    tokenId: string | number
    groupName: string
    title: string
    description: string
  }[]
}

const ImageSwarm: React.FC<ImageSwarmProps> = ({ images }) => {
  const [swarmItems, setSwarmItems] = useState<SwarmItem[]>([])
  const [selectedItem, setSelectedItem] = useState<SwarmItem | null>(null)
  const site = useSite()

  // Helper function to get the correct URL
  const getAccountUrl = (accountName: string) => {
    // Only add the prefix in development environment
    const isDev = process.env.NODE_ENV === 'development'
    const basePath = (isDev && site === 'onchain-agents') ? '/site-onchain-agents' : ''
    return `${basePath}/${accountName}`
  }

  useEffect(() => {
    const headerHeight = 60
    
    const items = images.map((img, index) => ({
      id: index,
      tokenId: img.tokenId,
      groupName: img.groupName,
      title: img.title,
      description: img.description,
      x: Math.random() * window.innerWidth,
      y: headerHeight + Math.random() * (window.innerHeight - headerHeight),
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
    }))
    setSwarmItems(items)

    const interval = setInterval(() => {
      setSwarmItems((prevItems) =>
        prevItems.map((item) => {
          const randomFactor = Math.random() * 0.4 - 0.2
          let newVx = item.vx + randomFactor
          let newVy = item.vy + randomFactor
          
          const maxSpeed = 4
          const speed = Math.sqrt(newVx * newVx + newVy * newVy)
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed
            newVy = (newVy / speed) * maxSpeed
          }

          let newX = item.x + newVx
          let newY = item.y + newVy

          // Check collisions with other agents
          prevItems.forEach(other => {
            if (other.id !== item.id) {
              const dx = newX - other.x
              const dy = newY - other.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              const minDistance = 100 // Size of agents plus some buffer

              if (distance < minDistance) {
                // Collision detected! Calculate bounce response
                const angle = Math.atan2(dy, dx)
                const targetX = other.x + Math.cos(angle) * minDistance
                const targetY = other.y + Math.sin(angle) * minDistance
                
                // Move away from collision
                newX = targetX
                newY = targetY
                
                // Bounce velocities
                const bounceForce = 0.8
                newVx = Math.cos(angle) * speed * bounceForce
                newVy = Math.sin(angle) * speed * bounceForce
              }
            }
          })

          // Wall bouncing
          if (newX < 0 || newX > window.innerWidth) {
            newVx *= -1 * (0.8 + Math.random() * 0.4)
          }
          if (newY < headerHeight || newY > window.innerHeight) {
            newVy *= -1 * (0.8 + Math.random() * 0.4)
          }

          return {
            ...item,
            x: newX,
            y: Math.max(headerHeight, Math.min(window.innerHeight, newY)),
            vx: newVx,
            vy: newVy,
          }
        })
      )
    }, 30)

    return () => clearInterval(interval)
  }, [images])

  return (
    <div className="fixed inset-0 overflow-hidden">
      {swarmItems.map((item) => (
        <SwarmImage key={item.id} item={item} onClick={() => setSelectedItem(item)} />
      ))}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-black/90">
          <div className="flex flex-col items-center gap-6">
            <DialogTitle className="text-2xl font-mono text-center">
              {selectedItem?.title}
            </DialogTitle>
            <Link 
              href={getAccountUrl(selectedItem?.title || '')}
              className="rounded-full overflow-hidden hover:scale-105 transition-transform"
            >
              <div className="w-[200px] h-[200px]">
                {selectedItem && (
                  <SwarmAccountImage
                    tokenId={selectedItem.tokenId}
                    groupName={selectedItem.groupName}
                    size="large"
                  />
                )}
              </div>
            </Link>
            <p className="text-lg text-center text-gray-200 max-w-md">
              {selectedItem?.description}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const SwarmImage: React.FC<{ item: SwarmItem; onClick: () => void }> = ({ item, onClick }) => {
  const spring = useSpring({
    to: { x: item.x, y: item.y },
    config: { tension: 120, friction: 14 },
  })

  return (
    <animated.div
      style={{
        ...spring,
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
      className="group relative"
    >
      <div className="rounded-full overflow-hidden w-[100px] h-[100px]">
        <SwarmAccountImage
          tokenId={item.tokenId}
          groupName={item.groupName}
          size="small"
          unoptimized
        />
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                    absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full 
                    bg-black/80 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap
                    z-50 pointer-events-none font-mono">
        {item.title}
      </div>
    </animated.div>
  )
}

export default ImageSwarm 