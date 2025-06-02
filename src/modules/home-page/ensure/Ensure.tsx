import { AssetSearch } from '@/modules/assets/AssetSearch'
import { useState, useEffect } from 'react'
import { TypewriterInput } from '@/components/ui/typewriter-input'
import { ensurePhrases } from '@/modules/ensure/ensurePhrases'
import { motion, AnimatePresence } from 'framer-motion'
import EnsureGrid from '@/modules/ensure/EnsureGrid'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function Ensure() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showTypewriter, setShowTypewriter] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [gridData, setGridData] = useState<any[]>([])

  // Show grid when user starts typing
  useEffect(() => {
    if (searchQuery.length > 0) {
      setShowGrid(true)
      setShowTypewriter(false)
      setIsInitialLoad(false)
    } else {
      setShowGrid(false)
      setShowTypewriter(true)
    }
  }, [searchQuery])

  return (
    <section className={cn(
      "relative w-full min-h-screen flex items-center justify-center bg-black",
      (!isInitialLoad || showGrid) && "items-start pt-8"
    )}>
      <div className="container mx-auto px-6 text-center">
        <h2 className={cn(
          "text-6xl md:text-7xl font-bold mb-8 text-white",
          (!isInitialLoad || showGrid) && "text-4xl md:text-5xl mb-4"
        )}>what do you want to ensure?</h2>
        <div className={cn(
          "w-full max-w-4xl mx-auto",
          showGrid ? "mb-6" : "mb-12"
        )}>
          <div className="relative">
            <AssetSearch 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder=""
              className={cn(
                "text-4xl md:text-5xl !max-w-none",
                showTypewriter && "caret-transparent"
              )}
              autoFocus
            />
            {showTypewriter && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <TypewriterInput words={ensurePhrases} />
              </div>
            )}
          </div>
        </div>
        
        <AnimatePresence>
          {showGrid && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EnsureGrid 
                searchQuery={searchQuery}
                types={['general', 'specific', 'syndicate', 'account', 'group']}
                variant="home"
                onDataChange={setGridData}
              />
              {gridData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <Link 
                    href="/ensure"
                    className="text-white/60 hover:text-white text-lg transition-colors duration-200"
                  >
                    see more
                  </Link>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
} 