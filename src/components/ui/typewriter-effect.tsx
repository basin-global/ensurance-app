'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TypewriterEffectProps {
  words: {
    text: string
  }[]
  className?: string
}

export function TypewriterEffect({ words, className }: TypewriterEffectProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length)
        setIsVisible(true)
      }, 400) // Faster fade out
    }, 2000) // More time to read each word

    return () => clearInterval(intervalId)
  }, [words.length])

  return (
    <div className={cn('flex items-center justify-start', className)}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className={cn("text-2xl md:text-3xl tracking-wide text-white/80 motion-span")}
          >
            {words[currentIndex].text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
} 