'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TypewriterWord {
  text: string
  typingSpeed?: number
  deletingSpeed?: number
  pauseTime?: number
}

interface TypewriterInputProps {
  words: TypewriterWord[]
  className?: string
}

export function TypewriterInput({ words, className }: TypewriterInputProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[currentWordIndex]
    const typingSpeed = currentWord.typingSpeed ?? 100
    const deletingSpeed = currentWord.deletingSpeed ?? 50
    const pauseTime = currentWord.pauseTime ?? 1000

    let timeout: NodeJS.Timeout

    if (!isDeleting) {
      // Typing phase
      if (currentText.length < currentWord.text.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentWord.text.slice(0, currentText.length + 1))
        }, typingSpeed)
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, pauseTime)
      }
    } else {
      // Deleting phase
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentWord.text.slice(0, currentText.length - 1))
        }, deletingSpeed)
      } else {
        // Finished deleting, move to next word
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        setIsDeleting(false)
      }
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [currentText, currentWordIndex, isDeleting, words])

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.span
        key={currentWordIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("text-4xl md:text-5xl text-white/80")}
      >
        {currentText}
        <span className="animate-blink">|</span>
      </motion.span>
    </div>
  )
} 