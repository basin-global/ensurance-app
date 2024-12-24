'use client'

import React, { useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SwarmItem {
  id: number
  src: string
  x: number
  y: number
  vx: number
  vy: number
  title: string
  description: string
}

interface ImageSwarmProps {
  images: {
    src: string
    title: string
    description: string
  }[]
}

const ImageSwarm: React.FC<ImageSwarmProps> = ({ images }) => {
  const [swarmItems, setSwarmItems] = useState<SwarmItem[]>([])
  const [selectedItem, setSelectedItem] = useState<SwarmItem | null>(null)

  useEffect(() => {
    const items = images.map((img, index) => ({
      id: index,
      src: img.src,
      title: img.title,
      description: img.description,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
    }))
    setSwarmItems(items)

    const interval = setInterval(() => {
      setSwarmItems((prevItems) =>
        prevItems.map((item) => {
          const randomFactor = Math.random() * 0.2 - 0.1
          let newVx = item.vx + randomFactor
          let newVy = item.vy + randomFactor
          
          const maxSpeed = 2
          const speed = Math.sqrt(newVx * newVx + newVy * newVy)
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed
            newVy = (newVy / speed) * maxSpeed
          }

          let newX = item.x + newVx
          let newY = item.y + newVy

          if (newX < 0 || newX > window.innerWidth) {
            newVx *= -1 * (0.8 + Math.random() * 0.4)
          }
          if (newY < 0 || newY > window.innerHeight) {
            newVy *= -1 * (0.8 + Math.random() * 0.4)
          }

          return {
            ...item,
            x: newX,
            y: newY,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full overflow-hidden">
              <Image
                src={selectedItem?.src || ''}
                alt={selectedItem?.title || ''}
                width={200}
                height={200}
                className="rounded-lg shadow-lg"
              />
            </div>
            <p>{selectedItem?.description}</p>
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
    >
      <div className="rounded-full overflow-hidden">
        <Image
          src={item.src}
          alt={item.title}
          width={100}
          height={100}
          className="hover:scale-110 transition-transform duration-300 cursor-pointer"
        />
      </div>
    </animated.div>
  )
}

export default ImageSwarm 