'use client'

import { forwardRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TypewriterInput } from '@/components/ui/typewriter-input'
import { ensurePhrases } from './ensurePhrases'
import { motion } from 'framer-motion'

interface MagnetSearchProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  showTypewriter: boolean
  className?: string
  onReset?: () => void
  onStartTyping?: () => void
}

export const MagnetSearch = forwardRef<HTMLInputElement, MagnetSearchProps>(
  function MagnetSearch({ searchQuery, setSearchQuery, showTypewriter, className, onReset, onStartTyping }, ref) {
    // Focus on mount
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.focus()
      }
    }, [ref])

    // Handle click outside
    useEffect(() => {
      function handleClick(e: MouseEvent) {
        const target = e.target as HTMLElement
        
        // Only handle clicks within EnsureMagnet
        const ensureMagnet = target.closest('.ensure-magnet')
        if (!ensureMagnet) return
        
        // Don't reset if clicking on:
        // 1. Search input or its container
        // 2. Tooltips or their triggers
        // 3. Orbs (which have cursor: pointer)
        if (
          (ref && 'current' in ref && ref.current?.contains(target)) ||
          target.closest('[data-radix-popper-content-wrapper]') ||
          target.closest('[data-radix-tooltip-trigger]') ||
          target.closest('[style*="cursor: pointer"]')
        ) {
          return
        }
        
        // Reset if clicking the background
        setSearchQuery('')
        if (onReset) onReset()
        // Refocus after reset
        setTimeout(() => {
          if (ref && 'current' in ref && ref.current) {
            ref.current.focus()
          }
        }, 0)
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [ref, setSearchQuery, onReset])

    // Handle ESC key
    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
          setSearchQuery('')
          if (onReset) onReset()
          // Refocus after reset
          setTimeout(() => {
            if (ref && 'current' in ref && ref.current) {
              ref.current.focus()
            }
          }, 0)
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [ref, setSearchQuery, onReset])

    return (
      <div className="relative w-full max-w-2xl mx-auto mb-0 flex flex-col items-center justify-center">
        <div className="relative w-full">
          <input
            ref={ref}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={() => {
              if (ref && 'current' in ref && ref.current) {
                ref.current.focus()
              }
              if (onStartTyping) {
                onStartTyping()
              }
            }}
            className={cn(
              "w-full bg-transparent text-white text-4xl md:text-5xl outline-none text-center caret-transparent",
              !searchQuery && "border-2 border-white/20 rounded-lg px-4 py-2",
              searchQuery && "text-transparent",
              className
            )}
            placeholder=""
          />
          {searchQuery && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/80 text-4xl md:text-5xl"
              >
                {searchQuery}
                <span className="inline-block w-[2px] h-[1.2em] bg-white/80 animate-blink align-middle ml-[2px]"></span>
              </motion.span>
            </div>
          )}
        </div>
        {showTypewriter && !searchQuery && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <TypewriterInput words={ensurePhrases} />
          </div>
        )}
        {!showTypewriter && !searchQuery && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/80 text-4xl md:text-5xl">
              <span className="inline-block w-[2px] h-[1.2em] bg-white/80 animate-blink align-middle"></span>
            </span>
          </div>
        )}
      </div>
    )
  }
) 