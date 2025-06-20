'use client'

import { useState, useEffect, useRef, forwardRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import AccountImage from '@/modules/accounts/AccountImage'
import { MagnetSearch } from './MagnetSearch'
import { EnsureTooltip } from './EnsureTooltip'
import { CONTRACTS } from '@/modules/specific/config'
import { useRouter } from 'next/navigation'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Maximum number of search results to display
const MAX_SEARCH_RESULTS = 48

// Types for the API response
interface GeneralCertificate {
  contract_address: string
  name: string
  description?: string
  image_url?: string
  type: 'general'
}

interface SpecificCertificate {
  tokenURI: string
  type: 'specific'
}

interface Account {
  full_account_name: string
  token_id: number
  group_name: string
  is_agent: boolean
  description?: string
  type: 'account'
}

interface Group {
  group_name: string
  name_front: string | null
  tagline: string | null
  description?: string
  type: 'group'
}

interface Syndicate {
  name: string
  description?: string
  media?: {
    banner?: string
  }
  image_url?: string
  type: 'syndicate'
}

type Certificate = GeneralCertificate | SpecificCertificate | Account | Group | Syndicate

interface SwarmOrb {
  id: string
  item: Certificate
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  opacity: number
  scale: number
  entryPhase: 'waiting' | 'entering' | 'positioning' | 'settled'
  entryDelay: number
  avoidanceRadius: number
}

// Helper function to score search relevance
function scoreSearchResult(item: Certificate, searchLower: string, tokenMetadata: any): number {
  let score = 0;
  
  if (item.type === 'general') {
    // Exact name match gets highest score
    if (item.name?.toLowerCase() === searchLower) score += 100;
    // Name contains search gets high score
    if (item.name?.toLowerCase().includes(searchLower)) score += 50;
    // Description contains search gets medium score
    if (item.description?.toLowerCase().includes(searchLower)) {
      score += 40;
      // Bonus for description match at start of words
      const words = item.description.toLowerCase().split(/\s+/);
      if (words.some(word => word.startsWith(searchLower))) {
        score += 10;
      }
    }
  } 
  else if (item.type === 'specific') {
    const meta = tokenMetadata[item.tokenURI];
    if (!meta || meta.error) return 0;
    if (meta.name?.toLowerCase() === searchLower) score += 100;
    if (meta.name?.toLowerCase().includes(searchLower)) score += 50;
    if (meta.description?.toLowerCase().includes(searchLower)) score += 25;
  }
  else if (item.type === 'account') {
    if (item.full_account_name?.toLowerCase() === searchLower) score += 100;
    if (item.full_account_name?.toLowerCase().includes(searchLower)) score += 50;
    if (item.description?.toLowerCase().includes(searchLower)) score += 25;
  }
  else if (item.type === 'group') {
    if (item.group_name.toLowerCase() === searchLower) score += 100;
    if (item.group_name.toLowerCase().includes(searchLower)) score += 50;
    if (item.name_front?.toLowerCase().includes(searchLower)) score += 40;
    if (item.tagline?.toLowerCase().includes(searchLower)) score += 30;
    if (item.description?.toLowerCase().includes(searchLower)) score += 25;
  }
  else if (item.type === 'syndicate') {
    if (item.name?.toLowerCase() === searchLower) score += 100;
    if (item.name?.toLowerCase().includes(searchLower)) score += 50;
    if (item.description?.toLowerCase().includes(searchLower)) score += 25;
  }

  // Boost natural capital items
  if (isNaturalCapital(item)) score += 20;

  return score;
}

// Calculate entry point from closest viewport edge to target
function calculateEntryPoint(targetX: number, targetY: number, viewport: { width: number, height: number }) {
  const buffer = 100
  const edges = [
    { x: targetX, y: -buffer, distance: targetY + buffer }, // top
    { x: viewport.width + buffer, y: targetY, distance: viewport.width + buffer - targetX }, // right
    { x: targetX, y: viewport.height + buffer, distance: viewport.height + buffer - targetY }, // bottom
    { x: -buffer, y: targetY, distance: targetX + buffer } // left
  ]
  
  // Find closest edge
  const closestEdge = edges.reduce((min, edge) => 
    edge.distance < min.distance ? edge : min
  )
  
  return { x: closestEdge.x, y: closestEdge.y }
}

// Generate coordinated target positions around search phrase
function generateSwarmPositions(count: number, centerX: number, centerY: number) {
  const positions = []
  const baseRadius = 200 // Increased for larger orbs
  
  for (let i = 0; i < count; i++) {
    // Calculate which layer this item belongs to
    let layer = 0
    let itemsInPreviousLayers = 0
    let itemsInCurrentLayer = 8
    
    while (itemsInPreviousLayers + itemsInCurrentLayer <= i) {
      itemsInPreviousLayers += itemsInCurrentLayer
      layer++
      itemsInCurrentLayer = 6 + layer * 3 // Each layer has more items
    }
    
    const indexInLayer = i - itemsInPreviousLayers
    const angleStep = (2 * Math.PI) / itemsInCurrentLayer
    
    const radius = baseRadius + (layer * 80) // More spacing between layers
    const angle = angleStep * indexInLayer + (layer * 0.3) // Offset each layer slightly
    
    // Add natural variation
    const variation = 25 // Slightly more variation for larger orbs
    const x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * variation
    const y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * variation
    
    positions.push({ x, y })
  }
  
  return positions
}

// Import or copy convertIpfsUrl
const convertIpfsUrl = (url: string) => {
  if (!url) return undefined
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Helper: get image for any item
function getItemImage(item: any, tokenMetadata: any) {
  if (item.type === 'general') return convertIpfsUrl(item.image_url)
  if (item.type === 'specific') {
    const meta = tokenMetadata[item.tokenURI]
    return meta && !meta.error && meta.image ? convertIpfsUrl(meta.image) : undefined
  }
  if (item.type === 'syndicate') return convertIpfsUrl(item.media?.banner || item.image_url)
  if (item.type === 'group') return `/groups/orbs/${item.group_name.replace(/^\./, '')}-orb.png`
  if (item.type === 'account') return undefined
  return undefined
}

// Helper function to check if item is natural capital
const isNaturalCapital = (item: any) => {
  if (item.type === 'account') {
    return item.group_name === '.ensurance'
  }
  if (item.type === 'group') {
    return item.group_name === '.ensurance'
  }
  return false
}

// MagnetImage handles fallback
const MagnetImage = forwardRef<HTMLImageElement, any>(({ src, alt, style, item, ...props }, ref) => {
  const [hasError, setHasError] = useState(false)
  const isNatural = isNaturalCapital(item)
  
  if (!src && !hasError) {
    return (
      <div 
        className="hover:scale-110 hover:brightness-110 transition-all duration-300 ease-out"
        style={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%', 
          background: '#222',
          boxShadow: isNatural 
            ? '0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 215, 0, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
          border: isNatural ? '2px solid rgba(255, 215, 0, 0.9)' : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...style 
        }} 
      />
    )
  }
  return (
    <img
      ref={ref}
      src={hasError || !src ? FALLBACK_IMAGE : src}
      alt={alt}
      className="hover:scale-110 hover:brightness-110 transition-all duration-300 ease-out"
      style={{ 
        width: 80, 
        height: 80, 
        borderRadius: '50%', 
        objectFit: 'cover', 
        background: '#222',
        boxShadow: isNatural 
          ? '0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 215, 0, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)'
          : '0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
        border: isNatural ? '2px solid rgba(255, 215, 0, 0.9)' : '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style 
      }}
      onError={() => setHasError(true)}
      {...props}
    />
  )
})

MagnetImage.displayName = 'MagnetImage'

// Helper: random offscreen position
function randomOffscreen(width: number, height: number) {
  const edge = Math.floor(Math.random() * 4)
  const buffer = 50
  switch (edge) {
    case 0: // top
      return { x: Math.random() * width, y: -buffer }
    case 1: // right
      return { x: width + buffer, y: Math.random() * height }
    case 2: // bottom
      return { x: Math.random() * width, y: height + buffer }
    case 3: // left
      return { x: -buffer, y: Math.random() * height }
    default:
      return { x: 0, y: 0 }
  }
}

// Helper: get a unique id for any item
function getItemId(item: Certificate) {
  switch (item.type) {
    case 'general':
      return 'general-' + item.contract_address
    case 'specific':
      return 'specific-' + item.tokenURI
    case 'syndicate':
      return 'syndicate-' + (item as any).name
    case 'group':
      return 'group-' + item.group_name
    case 'account':
      return 'account-' + (item as Account).full_account_name
    default:
      return 'unknown-' + Math.random().toString(36).slice(2)
  }
}

export function EnsureMagnet() {
  const router = useRouter()
  const [items, setItems] = useState<Certificate[]>([])
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTypewriter, setShowTypewriter] = useState(true)
  const [swarmOrbs, setSwarmOrbs] = useState<SwarmOrb[]>([])
  const [headingVisible, setHeadingVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track viewport size
  const [viewport, setViewport] = useState({ width: 1200, height: 800 })
  useEffect(() => {
    function update() {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight
      setViewport(prev => {
        if (prev.width !== newWidth || prev.height !== newHeight) {
          return { width: newWidth, height: newHeight }
        }
        return prev
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Magnet zone: center on viewport
  const [magnetZone, setMagnetZone] = useState({ x: 0, y: 0 })
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function update() {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      setMagnetZone(prev => {
        if (prev.x !== centerX || prev.y !== centerY) {
          return { x: centerX, y: centerY }
        }
        return prev
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Load basic data first for immediate search, then metadata progressively
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // First, fetch basic items without metadata for immediate search
        const basicResponse = await fetch('/api/ensure?metadata=false')
        if (!basicResponse.ok) {
          throw new Error(`HTTP ${basicResponse.status}: ${basicResponse.statusText}`)
        }

        const basicData = await basicResponse.json()
        if (basicData.error) {
          throw new Error(basicData.error)
        }

        if (mounted) {
          setItems(basicData.items || [])
          setLoading(false) // Items are ready, search can work now
        }

        // Then fetch metadata in background for richer search
        try {
          const metadataResponse = await fetch('/api/ensure?metadata=true')
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json()
            if (!metadataData.error && mounted) {
              setTokenMetadata(metadataData.tokenMetadata || {})
            }
          }
        } catch (metadataErr) {
          console.warn('Failed to load metadata, search will work with basic data only:', metadataErr)
        }

      } catch (err) {
        console.error('Error fetching ensure data:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { mounted = false }
  }, [])

  // Filter items by search - memoized to prevent infinite re-renders
  const filtered = useMemo(() => {
    if (!searchQuery) return []
    
    const searchLower = searchQuery.toLowerCase();
    return items.filter(item => {
      if (item.type === 'general') {
        const nameMatch = item.name?.toLowerCase().includes(searchLower) || false;
        const descMatch = item.description?.toLowerCase().includes(searchLower) || false;
        const searchWords = searchLower.split(/\s+/);
        const descWords = item.description?.toLowerCase().split(/\s+/) || [];
        const partialWordMatch = searchWords.some(word => 
          descWords.some((descWord: string) => descWord.includes(word))
        );
        return nameMatch || descMatch || partialWordMatch;
      } else if (item.type === 'specific') {
        const meta = tokenMetadata[item.tokenURI];
        if (!meta || meta.error) return false;
        const nameMatch = meta.name?.toLowerCase().includes(searchLower) || false;
        const descMatch = meta.description?.toLowerCase().includes(searchLower) || false;
        const searchWords = searchLower.split(/\s+/);
        const descWords = meta.description?.toLowerCase().split(/\s+/) || [];
        const partialWordMatch = searchWords.some(word => 
          descWords.some((descWord: string) => descWord.includes(word))
        );
        return nameMatch || descMatch || partialWordMatch;
      } else if (item.type === 'account') {
        return (
          item.full_account_name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        )
      } else if (item.type === 'group') {
        return (
          item.group_name.toLowerCase().includes(searchLower) ||
          (item.name_front?.toLowerCase().includes(searchLower)) ||
          (item.tagline?.toLowerCase().includes(searchLower)) ||
          (item.description?.toLowerCase().includes(searchLower))
        )
      } else if (item.type === 'syndicate') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        )
      } else {
        return false
      }
    })
  }, [searchQuery, items, tokenMetadata])

  // Create swarm when search changes
  useEffect(() => {
    if (!searchQuery) {
      // Clear swarm and reset UI
      setSwarmOrbs([])
      setHeadingVisible(true)
      return
    }
    
    setHeadingVisible(false)

    // Get scored and sorted results
    const searchLower = searchQuery.toLowerCase()
    const scoredResults = filtered
      .map(item => ({
        item,
        score: scoreSearchResult(item, searchLower, tokenMetadata)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SEARCH_RESULTS)
      .map(result => result.item)

    // Generate coordinated target positions
    const targetPositions = generateSwarmPositions(
      scoredResults.length, 
      magnetZone.x, 
      magnetZone.y
    )

         // Create swarm orbs ready to animate immediately
     const newSwarmOrbs = scoredResults.map((item, index) => {
       const targetPos = targetPositions[index]
       const entryPoint = calculateEntryPoint(targetPos.x, targetPos.y, viewport)
       
       return {
         id: getItemId(item),
         item,
         x: entryPoint.x,
         y: entryPoint.y,
         targetX: targetPos.x,
         targetY: targetPos.y,
         vx: 0,
         vy: 0,
         opacity: 1,
         scale: 1,
         entryPhase: 'entering' as const, // Ready to animate immediately
         entryDelay: index * 50,
         avoidanceRadius: 50
       }
     })

    setSwarmOrbs(newSwarmOrbs)
  }, [searchQuery, filtered, magnetZone.x, magnetZone.y])

    // No additional useEffects - handle everything at creation time

  // Clear swarm when search is cleared
  useEffect(() => {
    if (searchQuery) return
    if (!swarmOrbs.length) return
    
    // Animate out
    setSwarmOrbs(prev => prev.map(orb => ({ ...orb, opacity: 0, scale: 0 })))
    const timeout = setTimeout(() => setSwarmOrbs([]), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden ensure-magnet">
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" ref={containerRef}>
        {/* Heading */}
        <AnimatePresence>
          {headingVisible && (
            <motion.h2
              className="absolute left-1/2 -translate-x-1/2 z-10 text-white text-center max-w-screen-lg px-4 font-bold select-none
                whitespace-normal md:whitespace-nowrap"
              style={{
                bottom: 'calc(50% + 56px)',
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                lineHeight: 1.1,
                fontWeight: 700
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              what do you want to ensure?
            </motion.h2>
          )}
        </AnimatePresence>

        {/* Search box */}
        <div
          className="relative w-full max-w-2xl mx-auto mb-0 flex flex-col items-center justify-center"
          style={{ zIndex: 20 }}
        >
          <MagnetSearch
            ref={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showTypewriter={showTypewriter}
            onReset={() => {
              setShowTypewriter(true)
              setHeadingVisible(true)
              setSwarmOrbs([])
            }}
            onStartTyping={() => {
              setShowTypewriter(false)
            }}
            className={cn(
              "text-4xl md:text-5xl !max-w-none",
              showTypewriter && "caret-transparent"
            )}
          />
        </div>

        {/* Loading state - only show if items haven't loaded yet */}
        {searchQuery && swarmOrbs.length === 0 && loading && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-1/2 text-white/40 text-center"
            style={{ 
              zIndex: 30,
              top: 'calc(50% + 80px)',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm">Loading...</p>
          </motion.div>
        )}

        {/* No results - only show if we have items loaded but no matches */}
        {swarmOrbs.length === 0 && searchQuery && !loading && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-1/2 text-white/60 text-center"
            style={{ 
              zIndex: 30,
              top: 'calc(50% + 80px)',
              transform: 'translateX(-50%)'
            }}
          >
            <p className="text-xl">No matches found for "{searchQuery}"</p>
            <p className="text-sm mt-2">Try different keywords or browse all items</p>
          </motion.div>
        )}

        {/* Swarm orbs */}
        {swarmOrbs.map((orb, index) => (
          <EnsureTooltip
            key={orb.id}
            content={{
              name: (() => {
                const item = orb.item as Certificate
                switch (item.type) {
                  case 'general':
                    return (item as GeneralCertificate).name
                  case 'specific':
                    return tokenMetadata[(item as SpecificCertificate).tokenURI]?.name
                  case 'group':
                    return (item as Group).group_name
                  case 'account':
                    return (item as Account).full_account_name
                  case 'syndicate':
                    return (item as Syndicate).name
                  default:
                    return ''
                }
              })(),
              label: (() => {
                const item = orb.item as Certificate
                switch (item.type) {
                  case 'general':
                    return 'currency'
                  case 'specific':
                    return 'asset'
                  case 'group':
                    return 'group'
                  case 'account':
                    return 'account'
                  case 'syndicate':
                    return 'syndicate'
                  default:
                    return ''
                }
              })()
            }}
          >
            <div
              className="swarm-orb"
              style={{
                '--entry-x': `${orb.x - orb.targetX}px`,
                '--entry-y': `${orb.y - orb.targetY}px`,
                '--delay': `${index * 50}ms`,
                position: 'absolute',
                left: orb.targetX - 50,
                top: orb.targetY - 50,
                zIndex: 30,
                width: 100,
                height: 100,
                cursor: 'pointer'
              } as React.CSSProperties}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const href = orb.item.type === 'general' ? `/general/${orb.item.contract_address}` :
                            orb.item.type === 'specific' ? `/specific/${CONTRACTS.specific}/${orb.item.tokenURI.split('/').pop()}` :
                            orb.item.type === 'group' ? `/groups/${orb.item.group_name.replace(/^\./, '')}/all` :
                            orb.item.type === 'account' ? `/${(orb.item as Account).full_account_name}` :
                            `/syndicates/${(orb.item as any).name.toLowerCase().replace(/\s+/g, '-')}`;
                router.push(href);
              }}
            >
              {orb.item.type === 'account' ? (
                <div
                  className="w-full h-full hover:scale-110 hover:brightness-110 transition-all duration-300 ease-out"
                  style={{
                    borderRadius: '50%',
                    background: '#222',
                    boxShadow: isNaturalCapital(orb.item) 
                      ? '0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 215, 0, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)'
                      : '0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                    border: isNaturalCapital(orb.item) ? '2px solid rgba(255, 215, 0, 0.9)' : '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden'
                  }}
                >
                  <AccountImage
                    tokenId={orb.item.token_id}
                    groupName={orb.item.group_name?.replace('.', '')}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <MagnetImage
                  src={getItemImage(orb.item, tokenMetadata)}
                  alt="swarm-orb"
                  item={orb.item}
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                />
              )}
            </div>
          </EnsureTooltip>
        ))}
      </div>
    </section>
  )
}
