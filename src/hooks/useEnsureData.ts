import { useState, useEffect } from 'react'
import { getContractTokens, type TokenDisplayInfo } from '@/modules/specific/collect'
import { CONTRACTS } from '@/modules/specific/config'

// Types for different certificate types
export interface GeneralCertificate {
  contract_address: string
  name: string
  token_uri: string
  image_url?: string
  video_url?: string
  description?: string
  type: 'general'
}

export interface SpecificCertificate extends TokenDisplayInfo {
  type: 'specific'
  metadata?: {
    name?: string
    description?: string
    image?: string
    error?: boolean
  }
}

export interface Account {
  full_account_name: string
  token_id: number
  group_name: string
  is_agent: boolean
  description?: string
  type: 'account'
}

export interface Group {
  group_name: string
  name_front: string | null
  tagline: string | null
  description?: string
  total_supply: number
  contract_address: string
  is_active: boolean
  type: 'group'
}

export interface Syndicate {
  name: string
  description?: string
  media?: {
    banner?: string
  }
  image_url?: string
  type: 'syndicate'
}

export type Certificate = GeneralCertificate | SpecificCertificate | Account | Group | Syndicate

// Type guard functions
export function isGeneralCertificate(item: Certificate): item is GeneralCertificate {
  return item.type === 'general'
}

export function isSpecificCertificate(item: Certificate): item is SpecificCertificate {
  return item.type === 'specific'
}

export function isAccount(item: Certificate): item is Account {
  return item.type === 'account'
}

export function isGroup(item: Certificate): item is Group {
  return item.type === 'group'
}

export function isSyndicate(item: Certificate): item is Syndicate {
  return item.type === 'syndicate'
}

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Preload an image and resolve when loaded
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) return resolve()
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

function getItemId(item: Certificate): string {
  switch (item.type) {
    case 'general':
      return 'general-' + (item as GeneralCertificate).contract_address
    case 'specific':
      return 'specific-' + (item as SpecificCertificate).tokenURI
    case 'syndicate':
      return 'syndicate-' + (item as Syndicate).name
    case 'group':
      return 'group-' + (item as Group).group_name
    case 'account':
      return 'account-' + (item as Account).full_account_name
    default:
      return 'unknown-' + Math.random().toString(36).slice(2)
  }
}

export function useEnsureData({ waitForAll = false }: { waitForAll?: boolean } = {}) {
  const [items, setItems] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Filter items by search
  const filtered = searchQuery
    ? items.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        if (item.type === 'general') {
          return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
          )
        } else if (item.type === 'specific') {
          const meta = tokenMetadata[item.tokenURI]
          if (!meta || meta.error) return false
          return (
            meta.name?.toLowerCase().includes(searchLower) ||
            meta.description?.toLowerCase().includes(searchLower)
          )
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
    : items

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    setItems([])
    setTokenMetadata({})

    // Use a map to avoid duplicates and allow updates
    const itemMap: Record<string, Certificate> = {}
    const seen = new Set<string>()
    const updateItems = () => {
      if (mounted) {
        setItems(Object.values(itemMap))
      }
    }

    const fetchAll = async () => {
      try {
        // Fetch all sets in parallel
        const [general, specific, syndicates, accounts, groups] = await Promise.all([
          fetch('/api/general').then(r => r.ok ? r.json() : Promise.reject('Failed to fetch general')),
          getContractTokens(CONTRACTS.specific),
          fetch('/api/syndicates').then(r => r.ok ? r.json() : Promise.reject('Failed to fetch syndicates')),
          fetch('/api/accounts').then(r => r.ok ? r.json() : Promise.reject('Failed to fetch accounts')),
          fetch('/api/groups').then(r => r.ok ? r.json() : Promise.reject('Failed to fetch groups')),
        ])

        // Prepare items
        const validGeneralCerts = (general || [])
          .filter((cert: GeneralCertificate) => cert && cert.contract_address)
          .map((cert: GeneralCertificate) => ({ ...cert, type: 'general' as const, image_url: FALLBACK_IMAGE }))
        const specificWithType = (specific || []).map((token: TokenDisplayInfo) => ({
          ...token,
          type: 'specific' as const,
          metadata: undefined
        }))
        const syndicatesWithType = (syndicates || []).map((syndicate: Syndicate) => ({
          ...syndicate,
          type: 'syndicate' as const
        }))
        const accountsWithType = (accounts || []).map((account: Account) => ({
          ...account,
          type: 'account' as const
        }))
        const groupsWithType = (groups || [])
          .filter((group: Group) => group.is_active)
          .map((group: Group) => ({
            ...group,
            type: 'group' as const
          }))

        // Add all base items to map
        const allBaseItems = [
          ...validGeneralCerts,
          ...specificWithType,
          ...syndicatesWithType,
          ...accountsWithType,
          ...groupsWithType
        ]
        allBaseItems.forEach(item => {
          const id = getItemId(item)
          if (!seen.has(id)) {
            itemMap[id] = item
            seen.add(id)
          }
        })
        updateItems()

        // If not waiting for all, show grid ASAP
        if (!waitForAll) {
          setLoading(false)
        }

        // --- Fetch metadata/images in parallel ---
        // General metadata/images
        await Promise.all(validGeneralCerts.map(async (cert: GeneralCertificate) => {
          try {
            const fetchUrl = convertIpfsUrl(cert.token_uri)
            const response = await fetch(fetchUrl)
            if (!response.ok) throw new Error('Failed to fetch metadata')
            const data = await response.json()
            let imageUrl = data.image || data.content?.uri || FALLBACK_IMAGE
            imageUrl = convertIpfsUrl(imageUrl)
            cert.image_url = imageUrl
            // Update in map
            const id = getItemId(cert)
            itemMap[id] = { ...cert, image_url: imageUrl }
            updateItems()
            await preloadImage(imageUrl)
          } catch {
            cert.image_url = FALLBACK_IMAGE
            const id = getItemId(cert)
            itemMap[id] = { ...cert, image_url: FALLBACK_IMAGE }
            updateItems()
          }
        }))

        // Specific metadata/images
        const specificMetadata: Record<string, any> = {}
        await Promise.all(specificWithType.map(async (token: TokenDisplayInfo) => {
          try {
            let metadata
            if (token.tokenURI.startsWith('http')) {
              const response = await fetch(token.tokenURI)
              metadata = await response.json()
            } else {
              metadata = JSON.parse(token.tokenURI)
            }
            specificMetadata[token.tokenURI] = metadata
            const imageUrl = metadata.image ? convertIpfsUrl(metadata.image) : FALLBACK_IMAGE
            // Update in map
            const id = getItemId({ ...token, type: 'specific', metadata } as SpecificCertificate)
            itemMap[id] = { ...token, type: 'specific', metadata } as SpecificCertificate
            updateItems()
            await preloadImage(imageUrl)
          } catch {
            specificMetadata[token.tokenURI] = { error: true }
            const id = getItemId({ ...token, type: 'specific', metadata: { error: true } } as SpecificCertificate)
            itemMap[id] = { ...token, type: 'specific', metadata: { error: true } } as SpecificCertificate
            updateItems()
          }
        }))
        if (mounted) setTokenMetadata(specificMetadata)

        // Syndicate images
        await Promise.all(syndicatesWithType.map(async (syndicate: Syndicate) => {
          const bannerOrImage = syndicate.media?.banner || syndicate.image_url
          const imageUrl = bannerOrImage ? convertIpfsUrl(bannerOrImage) : FALLBACK_IMAGE
          await preloadImage(imageUrl)
        }))

        // Group images
        await Promise.all(groupsWithType.map(async (group: Group) => {
          const imageUrl = `/groups/orbs/${group.group_name.replace(/^\./, '')}-orb.png`
          await preloadImage(imageUrl)
        }))

        // When all is done, if waitForAll, set loading false
        if (waitForAll && mounted) {
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(typeof err === 'string' ? err : 'Failed to load data')
          setLoading(false)
        }
      }
    }

    fetchAll()
    return () => { mounted = false }
  }, [waitForAll])

  return { items: filtered, loading, error, tokenMetadata, setSearchQuery }
}
