'use client'

import { useState, useEffect, useRef } from 'react'
import { useEnsureData, Certificate } from '@/hooks/useEnsureData'
import { AssetSearch } from '@/modules/assets/AssetSearch'
import { TypewriterInput } from '@/components/ui/typewriter-input'
import { ensurePhrases } from '@/modules/ensure/ensurePhrases'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import AccountImage from '@/modules/accounts/AccountImage'

const FALLBACK_IMAGE = '/assets/no-image-found.png'

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

// MagnetImage handles fallback
function MagnetImage({ src, alt, style, ...props }: any) {
  const [hasError, setHasError] = useState(false)
  if (!src && !hasError) {
    return <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#222', ...style }} />
  }
  return (
    <motion.img
      src={hasError || !src ? FALLBACK_IMAGE : src}
      alt={alt}
      style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#222', ...style }}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}

// Helper: random offscreen position
function randomOffscreen(width: number, height: number) {
  const edge = Math.floor(Math.random() * 4)
  const buffer = 100
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
function getItemId(item: any) {
  switch (item.type) {
    case 'general':
      return 'general-' + item.contract_address
    case 'specific':
      return 'specific-' + item.tokenURI
    case 'syndicate':
      return 'syndicate-' + item.name
    case 'group':
      return 'group-' + item.group_name
    case 'account':
      return 'account-' + item.full_account_name
    default:
      return item.type + '-' + Math.random().toString(36).slice(2)
  }
}

export function EnsureMagnet() {
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
    opacity: number
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

  // Magnet zone: center on search box
  const [magnetZone, setMagnetZone] = useState({ x: 0, y: 0 })
  const [searchBoxRect, setSearchBoxRect] = useState<DOMRect | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Restore: update magnet zone when search box or viewport changes
  useEffect(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setMagnetZone({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setSearchBoxRect(rect);
    }
  }, [searchQuery, viewport]);

  // Reset everything to default if clicking outside the search box
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setSearchQuery('')
        setShowTypewriter(true)
        setHeadingVisible(true)
        setMagnetItems([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filter items by search
  const filtered = searchQuery
    ? items.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        if (item.type === 'general') {
          return item.name?.toLowerCase().includes(searchLower)
        } else if (item.type === 'specific') {
          const meta = tokenMetadata[item.tokenURI]
          if (!meta || meta.error) return false
          return meta.name?.toLowerCase().includes(searchLower)
        } else if (item.type === 'account') {
          return item.full_account_name?.toLowerCase().includes(searchLower)
        } else if (item.type === 'group') {
          return (
            item.group_name.toLowerCase().includes(searchLower) ||
            (item.name_front?.toLowerCase().includes(searchLower)) ||
            (item.tagline?.toLowerCase().includes(searchLower))
          )
        } else if (item.type === 'syndicate') {
          return item.name?.toLowerCase().includes(searchLower)
        } else {
          return false
        }
      })
    : items.filter(item => {
        // Show all items if no search, but for 'specific', only if metadata is loaded
        if (item.type === 'specific') {
          const meta = tokenMetadata[item.tokenURI]
          return meta && !meta.error
        }
        return true
      })

  // When search changes, set up magnet items
  useEffect(() => {
    if (!searchQuery) {
      setMagnetItems([])
      setHeadingVisible(true)
      return
    }
    setHeadingVisible(false)
    // Assign each filtered item a random offscreen start
    setMagnetItems(
      filtered.map(item => {
        const pos = randomOffscreen(viewport.width, viewport.height)
        return {
          id: getItemId(item),
          item,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          targetX: magnetZone.x + (Math.random() - 0.5) * 120, // spread around magnet zone
          targetY: magnetZone.y + (Math.random() - 0.5) * 80,
          opacity: 0
        }
      })
    )
  }, [searchQuery, items, tokenMetadata, viewport, magnetZone.x, magnetZone.y])

  // Helper: snap to nearest point on search box outline
  function snapToBoxEdge(x: number, y: number, rect: DOMRect) {
    // Offset so image edge, not center, touches the border
    const R = 32; // image radius
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    // If inside, snap to nearest edge and offset outward
    if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
      const dists = [
        { d: Math.abs(y - rect.top), x, y: rect.top - R }, // top
        { d: Math.abs(y - rect.bottom), x, y: rect.bottom + R }, // bottom
        { d: Math.abs(x - rect.left), x: rect.left - R, y }, // left
        { d: Math.abs(x - rect.right), x: rect.right + R, y }, // right
      ];
      dists.sort((a, b) => a.d - b.d);
      return { x: dists[0].x, y: dists[0].y };
    }
    // If outside, clamp to edge and offset outward
    // Find closest edge
    const dxLeft = Math.abs(x - rect.left);
    const dxRight = Math.abs(x - rect.right);
    const dyTop = Math.abs(y - rect.top);
    const dyBottom = Math.abs(y - rect.bottom);
    const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
    if (minDist === dxLeft) return { x: rect.left - R, y };
    if (minDist === dxRight) return { x: rect.right + R, y };
    if (minDist === dyTop) return { x, y: rect.top - R };
    return { x, y: rect.bottom + R };
  }

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
          // Magnet: slow when far, fast when close (inverse quadratic)
          let speed = 0.04 + 0.32 / (dist / 80 + 1) // tweakable
          // If close to magnet zone and searchBoxRect exists, snap to edge
          let nx = m.x + dx * speed
          let ny = m.y + dy * speed
          if (searchBoxRect && dist < Math.max(searchBoxRect.width, searchBoxRect.height) / 2 + 40) {
            const snapped = snapToBoxEdge(nx, ny, searchBoxRect)
            nx = snapped.x
            ny = snapped.y
          }
          // Repulsion
          let rx = 0, ry = 0
          for (let j = 0; j < arr.length; j++) {
            if (i === j) continue
            const o = arr[j]
            const ddx = nx - o.x
            const ddy = ny - o.y
            const d = Math.sqrt(ddx * ddx + ddy * ddy)
            if (d < 64 && d > 0) { // 64px = 2*radius
              // Stronger repulsion as they get closer
              const repulse = (64 - d) * 0.35 // was 0.18
              rx += (ddx / d) * repulse
              ry += (ddy / d) * repulse
            }
          }
          return {
            ...m,
            x: nx + rx,
            y: ny + ry,
            opacity: Math.min(1, m.opacity + 0.12)
          }
        })
        // Post-move clamp: ensure no overlap
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const a = updated[i]
            const b = updated[j]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < 64 && d > 0) {
              // Push them apart equally
              const overlap = 64 - d
              const ox = (dx / d) * (overlap / 2)
              const oy = (dy / d) * (overlap / 2)
              updated[i] = { ...a, x: a.x - ox, y: a.y - oy }
              updated[j] = { ...b, x: b.x + ox, y: b.y + oy }
            }
          }
        }
        return updated
      })
      if (running) requestAnimationFrame(animate)
    }
    animate()
    return () => { running = false }
  }, [magnetItems.length, searchBoxRect])

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
    <section className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center" ref={containerRef}>
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
          <AssetSearch
            ref={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            placeholder=""
            className={cn(
              "text-4xl md:text-5xl !max-w-none",
              showTypewriter && "caret-transparent"
            )}
            autoFocus
          />
          {showTypewriter && !searchQuery && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <TypewriterInput words={ensurePhrases} />
            </div>
          )}
        </div>
        {/* Magnetized images */}
        {magnetItems.map(m => (
          m.item.type === 'account' ? (
            <div
              key={m.id}
              style={{
                position: 'fixed',
                left: m.x - 32,
                top: m.y - 32,
                zIndex: 30,
                opacity: m.opacity,
                pointerEvents: 'none',
                boxShadow: '0 2px 12px #0008',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#222',
              }}
            >
              <AccountImage
                tokenId={m.item.token_id}
                groupName={m.item.group_name?.replace('.', '')}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <MagnetImage
              key={m.id}
              src={getItemImage(m.item, tokenMetadata)}
              alt="magnet-item"
              style={{
                position: 'fixed',
                left: m.x - 32,
                top: m.y - 32,
                zIndex: 30,
                opacity: m.opacity,
                pointerEvents: 'none',
                boxShadow: '0 2px 12px #0008',
                width: 64,
                height: 64,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: m.opacity }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )
        ))}
      </div>
    </section>
  )
}
