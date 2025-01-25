'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const SWARM_ORBS = [
    'ai', 'basin', 'bioregion', 'boulder', 'earth', 'higher', 'mumbai',
    'refi', 'sicilia', 'situs', 'tgn', 'tokyo', 'fi', 'la', 'capital', 'solar', 'solarpunk', 'ents'
]

interface SwarmItem {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    angle: number
    orbName: string
    speed: number
}

export function HomeSwarm() {
    const [items, setItems] = useState<SwarmItem[]>([])
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [startTime] = useState(Date.now())
    const organizationDelay = 2000    // 2 seconds of pure random movement
    const organizationDuration = 8000 // 8 seconds to organize
    
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }

        updateDimensions()
        window.addEventListener('resize', updateDimensions)

        // Initialize swarm with deterministic speeds and angles
        const swarmItems = SWARM_ORBS.map((orbName, i) => {
            // Distribute initial positions across viewport
            const angle = (i / SWARM_ORBS.length) * Math.PI * 2
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 48,
                angle: angle,
                orbName,
                speed: 0.003 + (i / SWARM_ORBS.length) * 0.004  // Faster base speeds with wider variation
            }
        })

        setItems(swarmItems)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    useEffect(() => {
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2 - 120
        const orbitRadius = Math.min(dimensions.width, dimensions.height) * 0.28

        const animationFrame = requestAnimationFrame(function animate() {
            const elapsed = Date.now() - startTime
            const organizationPhase = Math.min(Math.max((elapsed - organizationDelay) / organizationDuration, 0), 1)
            
            // Smooth easing function
            const eased = organizationPhase < 0.5
                ? 4 * organizationPhase * organizationPhase * organizationPhase
                : 1 - Math.pow(-2 * organizationPhase + 2, 3) / 2
            
            setItems(currentItems => 
                currentItems.map((item) => {
                    if (organizationPhase > 0) {
                        // Gradual transition from random to orbital
                        const randomFactor = Math.max(0, 1 - eased * 0.5)
                        const orbitalFactor = eased * 0.15

                        // Random movement component
                        if (randomFactor > 0) {
                            item.x += item.vx * randomFactor
                            item.y += item.vy * randomFactor

                            // Bounce off boundaries
                            if (item.x < 0 || item.x > dimensions.width) {
                                item.vx *= -1
                                item.x = Math.max(0, Math.min(dimensions.width, item.x))
                            }
                            if (item.y < 0 || item.y > dimensions.height) {
                                item.vy *= -1
                                item.y = Math.max(0, Math.min(dimensions.height, item.y))
                            }
                        }

                        // Orbital movement component
                        if (orbitalFactor > 0) {
                            // Speed up in final phase
                            const finalSpeedBoost = organizationPhase > 0.8 ? 5 : 1  // Increased from 3 to 5
                            item.angle += item.speed * orbitalFactor * finalSpeedBoost

                            const targetX = centerX + Math.cos(item.angle) * orbitRadius
                            const targetY = centerY + Math.sin(item.angle) * orbitRadius
                            
                            const dx = targetX - item.x
                            const dy = targetY - item.y
                            
                            // Stronger pull to orbit for more circular path
                            const moveSpeed = 0.01 + (eased * 0.04)  // Doubled pull strength
                            item.x += dx * moveSpeed
                            item.y += dy * moveSpeed
                        }
                    } else {
                        // Pure random movement
                        item.x += item.vx
                        item.y += item.vy

                        if (item.x < 0 || item.x > dimensions.width) {
                            item.vx *= -1
                            item.x = Math.max(0, Math.min(dimensions.width, item.x))
                        }
                        if (item.y < 0 || item.y > dimensions.height) {
                            item.vy *= -1
                            item.y = Math.max(0, Math.min(dimensions.height, item.y))
                        }
                    }

                    return item
                })
            )

            requestAnimationFrame(animate)
        })

        return () => cancelAnimationFrame(animationFrame)
    }, [dimensions, startTime])

    return (
        <div className="relative w-full h-screen flex items-center justify-center">
            {/* Center Orb */}
            <Link 
                href="/groups"
                className="absolute cursor-pointer transition-transform hover:scale-105"
                style={{
                    left: `${dimensions.width / 2 - 100}px`,
                    top: `${dimensions.height / 2 - 220}px`, // Reduced offset to move down
                }}
            >
                <Image
                    src="/groups/orbs/ensurance-orb.png"
                    alt="Ensurance Orb"
                    width={200}
                    height={200}
                    className="rounded-full"
                    priority
                />
            </Link>

            {/* Swarm Items */}
            {items.map((item, index) => (
                <div
                    key={index}
                    className="absolute transition-transform duration-100 pointer-events-none"
                    style={{
                        left: `${item.x - item.size / 2}px`,
                        top: `${item.y - item.size / 2}px`,
                        width: `${item.size}px`,
                        height: `${item.size}px`,
                    }}
                >
                    <Image
                        src={`/groups/orbs/${item.orbName}-orb.png`}
                        alt={`${item.orbName} orb`}
                        width={item.size}
                        height={item.size}
                        className="rounded-full opacity-60"
                    />
                </div>
            ))}
        </div>
    )
} 