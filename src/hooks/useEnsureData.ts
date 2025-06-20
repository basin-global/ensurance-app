import { useState, useEffect } from 'react'

// Types for different certificate types
export interface GeneralCertificate {
  contract_address: string
  name: string
  description?: string
  image_url?: string
  type: 'general'
}

export interface SpecificCertificate {
  tokenURI: string
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

export function useEnsureData({ waitForAll = false }: { waitForAll?: boolean } = {}) {
  const [items, setItems] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, any>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        // Use the new unified endpoint
        const url = waitForAll ? '/api/ensure?metadata=true' : '/api/ensure?metadata=false'
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        if (mounted) {
          setItems(data.items || [])
          setTokenMetadata(data.tokenMetadata || {})
          
          // If not waiting for all metadata, fetch it in background
          if (!waitForAll && data.items?.some((item: Certificate) => item.type === 'specific')) {
            // Fetch metadata in background
            fetch('/api/ensure?metadata=true')
              .then(res => res.json())
              .then(backgroundData => {
                if (mounted && backgroundData.tokenMetadata) {
                  setTokenMetadata(backgroundData.tokenMetadata)
                }
              })
              .catch(err => console.error('Background metadata fetch failed:', err))
          }
          
          setLoading(false)
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
    
    return () => {
      mounted = false
    }
  }, [waitForAll])

  return { 
    items, 
    loading, 
    error, 
    tokenMetadata,
    // Remove setSearchQuery as filtering will be handled by the component
  }
}
