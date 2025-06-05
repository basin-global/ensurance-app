'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import { useEnsureData, Certificate, Account, Syndicate, GeneralCertificate, SpecificCertificate, Group, isGeneralCertificate, isSpecificCertificate, isAccount, isGroup, isSyndicate } from '@/hooks/useEnsureData'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { TypewriterInput } from '@/components/ui/typewriter-input'
import { ensurePhrases } from '@/modules/ensure/ensurePhrases'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import AccountImage from '@/modules/accounts/AccountImage'
import { MagnetSearch } from './MagnetSearch'
import { EnsureTooltip } from './EnsureTooltip'
import { CONTRACTS } from '@/modules/specific/config'
import { useRouter } from 'next/navigation'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Maximum number of search results to display
const MAX_SEARCH_RESULTS = 36

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
      score += 40; // Increased from 25 to 40
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
        style={{ 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          background: '#222',
          ...(isNatural && {
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3)',
            border: '2px solid rgba(255, 215, 0, 0.8)'
          }),
          ...style 
        }} 
      />
    )
  }
  return (
    <motion.img
      ref={ref}
      src={hasError || !src ? FALLBACK_IMAGE : src}
      alt={alt}
      style={{ 
        width: 64, 
        height: 64, 
        borderRadius: '50%', 
        objectFit: 'cover', 
        background: '#222',
        ...(isNatural && {
          boxShadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3)',
          border: '2px solid rgba(255, 215, 0, 0.8)'
        }),
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
  const buffer = 50 // reduced buffer to keep items closer to viewport
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
  const { items, tokenMetadata, loading, error } = useEnsureData({ waitForAll: true })
  const [searchQuery, setSearchQuery] = useState('')
  const [showTypewriter, setShowTypewriter] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [magnetItems, setMagnetItems] = useState<Array<{
    id: string,
    item: Certificate,
    x: number,
    y: number,
    vx: number,
    vy: number,
    targetX: number,
    targetY: number,
    opacity: number,
    radiusVariation: number
  }>>([])
  const [headingVisible, setHeadingVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track viewport size
  const [viewport, setViewport] = useState({ width: 1200, height: 800 })
  useEffect(() => {
    function update() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Magnet zone: center on viewport
  const [magnetZone, setMagnetZone] = useState({ x: 0, y: 0 })
  const [magnetRadius, setMagnetRadius] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Update magnet zone when viewport changes
  useEffect(() => {
    function update() {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      setMagnetZone({ x: centerX, y: centerY })
      // Set radius to fit search text with padding
      const textWidth = searchInputRef.current?.offsetWidth || 0
      const textHeight = searchInputRef.current?.offsetHeight || 0
      setMagnetRadius(Math.max(textWidth, textHeight) * 0.4)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Filter items by search
  const filtered = searchQuery
    ? items.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        if (item.type === 'general') {
          const nameMatch = item.name?.toLowerCase().includes(searchLower) || false;
          const descMatch = item.description?.toLowerCase().includes(searchLower) || false;
          // Split search into words for partial matching
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
    : items.filter(item => {
        // Show all items if no search, but for 'specific', only if metadata is loaded
        if (item.type === 'specific') {
          const meta = tokenMetadata[item.tokenURI];
          return meta && !meta.error;
        }
        return true;
      })

  // When search changes, set up magnet items
  useEffect(() => {
    if (!searchQuery) {
      setMagnetItems([])
      setHeadingVisible(true)
      return
    }
    setHeadingVisible(false)

    // Score and sort results by relevance
    const searchLower = searchQuery.toLowerCase();
    const scoredResults = filtered
      .map(item => ({
        item,
        score: scoreSearchResult(item, searchLower, tokenMetadata)
      }))
      .filter(result => result.score > 0) // Only include items with some relevance
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, MAX_SEARCH_RESULTS) // Take top N results
      .map(result => result.item);

    // Assign each filtered item a random offscreen start
    setMagnetItems(
      scoredResults.map(item => {
        const pos = randomOffscreen(viewport.width, viewport.height)
        return {
          id: getItemId(item),
          item,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          targetX: magnetZone.x + (Math.random() - 0.5) * 120,
          targetY: magnetZone.y + (Math.random() - 0.5) * 80,
          opacity: 0,
          radiusVariation: 0.9 + Math.random() * 0.2
        }
      })
    )
  }, [searchQuery, items, tokenMetadata, viewport, magnetZone.x, magnetZone.y])

  // Animate magnet items toward magnet zone, with repulsion
  useEffect(() => {
    if (!magnetItems.length) return
    let running = true
    function animate() {
      setMagnetItems(prev => {
        // Physics: move toward target, repel from each other
        let updated = prev.map((m, i, arr) => {
          let dx = m.targetX - m.x
          let dy = m.targetY - m.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          // Much slower velocity update with magnetic pull
          let vx = m.vx * 0.99 // even less damping for smoother movement
          let vy = m.vy * 0.99
          
          // Much gentler magnetic pull toward target
          const pullStrength = 0.03 // reduced from 0.03 for even slower movement
          vx += dx * pullStrength
          vy += dy * pullStrength
          
          // Higher max speed for faster movement
          const maxSpeed = 4 // increased from 1.5 to allow faster movement
          const currentSpeed = Math.sqrt(vx * vx + vy * vy)
          if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed
            vx *= scale
            vy *= scale
          }
          
          // Update position
          let nx = m.x + vx
          let ny = m.y + vy
          
          // Only check inner radius - no outer radius constraint
          const innerRadius = magnetRadius * 0.8
          const currentDist = Math.sqrt((nx - magnetZone.x) ** 2 + (ny - magnetZone.y) ** 2)
          
          if (currentDist < innerRadius) {
            // Move to inner radius
            const scale = innerRadius / currentDist
            nx = magnetZone.x + (nx - magnetZone.x) * scale
            ny = magnetZone.y + (ny - magnetZone.y) * scale
            vx = 0
            vy = 0
          }
          
          // Simple collision handling - just prevent overlap
          for (let j = 0; j < arr.length; j++) {
            if (i === j) continue
            const o = arr[j]
            const ddx = nx - o.x
            const ddy = ny - o.y
            const d = Math.sqrt(ddx * ddx + ddy * ddy)
            if (d < 64 && d > 0) {
              // Move apart to prevent overlap
              const overlap = 64 - d
              nx += (ddx / d) * overlap * 0.5
              ny += (ddy / d) * overlap * 0.5
              vx = 0
              vy = 0
            }
          }
          
          return {
            ...m,
            x: nx,
            y: ny,
            vx,
            vy,
            opacity: Math.min(1, m.opacity + 0.05) // even slower fade in
          }
        })
        return updated
      })
      if (running) requestAnimationFrame(animate)
    }
    animate()
    return () => { running = false }
  }, [magnetItems.length, magnetRadius])

  // Fade out all items if search is cleared
  useEffect(() => {
    if (searchQuery) return
    if (!magnetItems.length) return
    // Animate opacity to 0, then remove
    let timeout = setTimeout(() => setMagnetItems([]), 400)
    setMagnetItems(prev => prev.map(m => ({ ...m, opacity: 0 })))
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Heading fade out
  useEffect(() => {
    if (!headingVisible) return
    if (searchQuery) setHeadingVisible(false)
  }, [searchQuery, headingVisible])

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden ensure-magnet">
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" ref={containerRef}>
        {/* Heading absolutely above search box */}
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
        {/* Centered search box */}
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
              setMagnetItems([])
            }}
            className={cn(
              "text-4xl md:text-5xl !max-w-none",
              showTypewriter && "caret-transparent"
            )}
          />
        </div>
        {/* Magnetized images */}
        {magnetItems.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-1/2 text-white/60 text-center"
            style={{ 
              zIndex: 30,
              top: 'calc(50% + 80px)', // Position below search box
              transform: 'translateX(-50%)'
            }}
          >
            <p className="text-xl">No matches found for "{searchQuery}"</p>
            <p className="text-sm mt-2">Try different keywords or browse all items</p>
          </motion.div>
        )}
        {magnetItems.map(m => (
          m.item.type === 'account' ? (
            <EnsureTooltip
              key={m.id}
              content={{
                name: (m.item as Account).full_account_name,
                label: 'account'
              }}
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/${(m.item as Account).full_account_name}`);
                }}
                style={{
                  position: 'absolute',
                  left: m.x - 32,
                  top: m.y - 32,
                  zIndex: 30,
                  opacity: m.opacity,
                  boxShadow: isNaturalCapital(m.item) 
                    ? '0 0 15px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3)'
                    : '0 2px 12px #0008',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#222',
                  border: isNaturalCapital(m.item) ? '2px solid rgba(255, 215, 0, 0.8)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <a 
                  href={`/${(m.item as Account).full_account_name}`}
                  style={{ display: 'block', width: '100%', height: '100%' }}
                >
                  <AccountImage
                    tokenId={m.item.token_id}
                    groupName={m.item.group_name?.replace('.', '')}
                    className="w-full h-full object-cover"
                  />
                </a>
              </div>
            </EnsureTooltip>
          ) : (
            <EnsureTooltip
              key={m.id}
              content={{
                name: (() => {
                  const item = m.item as Certificate
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
                  const item = m.item as Certificate
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
              <a
                href={m.item.type === 'general' ? `/general/${m.item.contract_address}` :
                      m.item.type === 'specific' ? `/specific/${CONTRACTS.specific}/${m.item.tokenURI.split('/').pop()}` :
                      m.item.type === 'group' ? `/groups/${m.item.group_name.replace(/^\./, '')}/all` :
                      `/syndicates/${(m.item as any).name.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  position: 'absolute',
                  left: m.x - 32,
                  top: m.y - 32,
                  zIndex: 30,
                  opacity: m.opacity,
                  width: 64,
                  height: 64,
                  cursor: 'pointer',
                  display: 'block'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = m.item.type === 'general' ? `/general/${m.item.contract_address}` :
                              m.item.type === 'specific' ? `/specific/${CONTRACTS.specific}/${m.item.tokenURI.split('/').pop()}` :
                              m.item.type === 'group' ? `/groups/${m.item.group_name.replace(/^\./, '')}/all` :
                              `/syndicates/${(m.item as any).name.toLowerCase().replace(/\s+/g, '-')}`;
                  router.push(href);
                }}
              >
                <MagnetImage
                  src={getItemImage(m.item, tokenMetadata)}
                  alt="magnet-item"
                  item={m.item}
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: m.opacity }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </a>
            </EnsureTooltip>
          )
        ))}
      </div>
    </section>
  )
}
