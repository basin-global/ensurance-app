'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, PlusCircle } from 'lucide-react'
import { getContractTokens, type TokenDisplayInfo } from '@/modules/specific/collect'
import { CONTRACTS } from '@/modules/specific/config'
import AccountImage from '@/modules/accounts/AccountImage'
import { cn } from '@/lib/utils'
import { useEnsureData, Certificate } from '@/hooks/useEnsureData'

interface EnsureGridProps {
  searchQuery?: string
  urlPrefix?: string
  onDataChange?: (data: Certificate[]) => void
  types?: ('general' | 'specific' | 'syndicate' | 'account' | 'group')[]
  variant?: 'default' | 'home'
}

const FALLBACK_IMAGE = '/assets/no-image-found.png'

// Helper function to check if item is natural capital
const isNaturalCapital = (item: Certificate) => {
  if (item.type === 'account') {
    return item.group_name === '.ensurance'
  }
  if (item.type === 'group') {
    return item.group_name === '.ensurance'
  }
  return false
}

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Status dot component for specific certificates
const StatusDot = ({ active }: { active: boolean }) => {
  return (
    <span className={`w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse ${
      active 
        ? "bg-green-500 after:bg-green-500/50" 
        : "bg-red-500 after:bg-red-500/50"
    }`} />
  )
}

const ITEMS_PER_PAGE = 12

type SortField = 'general' | 'specific' | 'syndicate' | 'account' | 'group'

interface SortConfig {
  field: SortField
}

const SORT_CYCLES: SortField[] = ['general', 'specific', 'syndicate', 'account', 'group']

export default function EnsureGrid({ 
  searchQuery = '',
  urlPrefix = '',
  onDataChange,
  types = ['general', 'specific', 'syndicate', 'account', 'group'],
  variant = 'default'
}: EnsureGridProps) {
  // Use the new hook for data
  const { items, loading, error, tokenMetadata } = useEnsureData({ waitForAll: false })
  const [page, setPage] = useState(1)
  const [selectedTypes, setSelectedTypes] = useState<typeof types>(types)
  const [sort, setSort] = useState<SortConfig>({ field: 'general' })

  const filterOptions = [
    { value: 'all', label: 'all' },
    { value: 'general', label: 'general' },
    { value: 'specific', label: 'specific' },
    { value: 'syndicate', label: 'syndicate' },
    { value: 'account', label: 'account' },
    { value: 'group', label: 'group' }
  ]

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const handleSortClick = () => {
    const fields = SORT_CYCLES
    const currentIndex = fields.indexOf(sort.field)
    
    // Move to next field, or back to first if at end
    const nextField = fields[(currentIndex + 1) % fields.length]
    
    setSort({
      field: nextField
    })
  }

  const getSortLabel = () => {
    const labels = {
      general: 'Show general certificates',
      specific: 'Show specific certificates',
      syndicate: 'Show syndicates',
      account: 'Show accounts',
      group: 'Show groups'
    }
    return labels[sort.field]
  }

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => selectedTypes.includes(item.type))
    
    if (!searchQuery) return filtered
    
    const searchLower = searchQuery.toLowerCase()
    return filtered.filter(item => {
      if (item.type === 'general') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        )
      } else if (item.type === 'specific') {
        const metadata = tokenMetadata[item.tokenURI]
        if (!metadata || metadata.error) return false
        return (
          metadata.name?.toLowerCase().includes(searchLower) ||
          metadata.description?.toLowerCase().includes(searchLower)
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
      }
      return false
    })
  }, [items, searchQuery, tokenMetadata, selectedTypes])

  // Sort filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // Filter to show only the selected type
      return a.type === sort.field ? -1 : b.type === sort.field ? 1 : 0
    })
  }, [filteredItems, sort])

  // Memoize displayed items
  const displayedItems = useMemo(() => {
    return sortedItems.slice(0, page * ITEMS_PER_PAGE)
  }, [sortedItems, page])

  // Load more items
  const loadMore = useCallback(() => {
    if (displayedItems.length < sortedItems.length) {
      setPage(p => p + 1)
    }
  }, [displayedItems.length, sortedItems.length])

  // Handle scroll-based loading
  useEffect(() => {
    const handleScroll = () => {
      if (loading || displayedItems.length >= sortedItems.length) return;
      
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= 
        document.documentElement.scrollHeight - 1000;

      if (scrolledToBottom) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadMore, displayedItems.length, sortedItems.length]);

  if (items.length === 0 && loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No items found{searchQuery ? ' matching your search' : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar - Only show in default variant */}
      {variant === 'default' && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSortClick}
            className="bg-gray-900/30 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
            title={getSortLabel()}
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>

          <Select 
            value={selectedTypes.length === 1 ? selectedTypes[0] : 'all'} 
            onValueChange={(value) => {
              if (value === 'all') {
                setSelectedTypes(['general', 'specific', 'syndicate', 'account', 'group'])
              } else {
                setSelectedTypes([value as typeof types[0]])
              }
            }}
          >
            <SelectTrigger className="text-xl font-medium bg-transparent border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none pl-0 pr-2 h-auto w-auto">
              <SelectValue placeholder="all" />
            </SelectTrigger>
            <SelectContent className="bg-[#000] border-gray-800">
              {filterOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white hover:bg-[#111] focus:bg-[#111] cursor-pointer"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={cn(
        "grid gap-6",
        variant === 'default' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      )}>
        {displayedItems.map((item) => {
          if (item.type === 'general') {
            return (
              <Link 
                key={item.contract_address} 
                href={`${urlPrefix}/general/${item.contract_address}`}
                className="block"
              >
                <Card className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  variant === 'home' && "hover:scale-105"
                )}>
                  <CardContent className={cn(
                    "p-4",
                    variant === 'home' && "p-2"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <Image
                          src={item.image_url || FALLBACK_IMAGE}
                          alt={item.name || 'Certificate'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          priority={false}
                          loading="lazy"
                          className="object-cover"
                          unoptimized={item.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = FALLBACK_IMAGE;
                          }}
                        />
                        <div className={cn(
                          "absolute top-2 right-2 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
                          isNaturalCapital(item) 
                            ? "bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-black"
                            : "bg-black/60 text-white/90"
                        )}>
                          {isNaturalCapital(item) ? 'natural capital' : 'general'}
                        </div>
                      </div>
                      <div className={cn(
                        "text-center line-clamp-2",
                        variant === 'home' ? "text-sm font-medium text-white/90 mt-1" : "text-lg font-semibold text-white"
                      )}>
                        {item.name || 'Unnamed Certificate'}
                      </div>
                      {variant === 'default' && (
                        <button className="w-full flex justify-center items-center py-2">
                          <PlusCircle className="w-7 h-7 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          } else if (item.type === 'specific') {
            const metadata = tokenMetadata[item.tokenURI]
            const metadataError = metadata?.error
            let imageUrl = FALLBACK_IMAGE

            if (metadata && !metadataError && metadata.image) {
              imageUrl = convertIpfsUrl(metadata.image)
            }

            return (
              <Link 
                key={item.tokenURI} 
                href={`${urlPrefix}/specific/${CONTRACTS.specific}/${item.tokenURI.split('/').pop()}`}
                className="block"
              >
                <Card className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  variant === 'home' && "hover:scale-105"
                )}>
                  <CardContent className={cn(
                    "p-4",
                    variant === 'home' && "p-2"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <Image
                          src={imageUrl}
                          alt={metadata?.name || 'Token'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                          unoptimized={imageUrl?.toLowerCase?.()?.endsWith('.gif') || false}
                          onError={(e: any) => {
                            e.target.src = FALLBACK_IMAGE
                          }}
                        />
                        <div className={cn(
                          "absolute top-2 right-2 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
                          isNaturalCapital(item) 
                            ? "bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-black"
                            : "bg-black/60 text-white/90"
                        )}>
                          {isNaturalCapital(item) ? 'natural capital' : 'specific'}
                        </div>
                      </div>
                      <div className={cn(
                        "text-center line-clamp-2",
                        variant === 'home' ? "text-sm font-medium text-white/90 mt-1" : "text-lg font-semibold text-white"
                      )}>
                        {metadata && !metadataError ? metadata.name || 'Unnamed Token' : 'Unnamed Token'}
                      </div>
                      {variant === 'default' && (
                        <button className="w-full flex justify-center items-center py-2">
                          <PlusCircle className="w-7 h-7 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          } else if (item.type === 'account') {
            return (
              <Link 
                key={item.full_account_name} 
                href={`${urlPrefix}/${item.full_account_name}`}
                className="block"
              >
                <Card className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  variant === 'home' && "hover:scale-105"
                )}>
                  <CardContent className={cn(
                    "p-4",
                    variant === 'home' && "p-2"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <div className="w-full h-full flex items-center justify-center">
                          <AccountImage
                            tokenId={item.token_id}
                            groupName={item.group_name?.replace('.', '')}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className={cn(
                          "absolute top-2 right-2 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
                          isNaturalCapital(item) 
                            ? "bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-black"
                            : "bg-black/60 text-white/90"
                        )}>
                          {isNaturalCapital(item) ? 'natural capital' : 'account'}
                        </div>
                      </div>
                      <div className={cn(
                        "text-center line-clamp-2",
                        variant === 'home' ? "text-sm font-medium text-white/90 mt-1" : "text-lg font-semibold text-white"
                      )}>
                        {item.full_account_name}
                      </div>
                      {variant === 'default' && (
                        <button className="w-full flex justify-center items-center py-2">
                          <PlusCircle className="w-7 h-7 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          } else if (item.type === 'group') {
            return (
              <Link 
                key={item.contract_address} 
                href={`${urlPrefix}/groups/${item.group_name.replace(/^\./, '')}/all`}
                className="block"
              >
                <Card className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  variant === 'home' && "hover:scale-105"
                )}>
                  <CardContent className={cn(
                    "p-4",
                    variant === 'home' && "p-2"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <Image
                          src={`/groups/orbs/${item.group_name.replace(/^\./, '')}-orb.png`}
                          alt={`${item.group_name} orb`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                          onError={(e: any) => {
                            e.target.src = FALLBACK_IMAGE
                          }}
                        />
                        <div className={cn(
                          "absolute top-2 right-2 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
                          isNaturalCapital(item) 
                            ? "bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-black"
                            : "bg-black/60 text-white/90"
                        )}>
                          {isNaturalCapital(item) ? 'natural capital' : 'group'}
                        </div>
                      </div>
                      <div className={cn(
                        "text-center line-clamp-2",
                        variant === 'home' ? "text-sm font-medium text-white/90 mt-1" : "text-lg font-semibold text-white"
                      )}>
                        {item.group_name}
                      </div>
                      {variant === 'default' && (
                        <button className="w-full flex justify-center items-center py-2">
                          <PlusCircle className="w-7 h-7 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          } else {
            return (
              <Link 
                key={item.name} 
                href={`${urlPrefix}/syndicates/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="block"
              >
                <Card className={cn(
                  "bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors",
                  variant === 'home' && "hover:scale-105"
                )}>
                  <CardContent className={cn(
                    "p-4",
                    variant === 'home' && "p-2"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
                        <Image
                          src={item.media?.banner || item.image_url || FALLBACK_IMAGE}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                          onError={(e: any) => {
                            e.target.src = FALLBACK_IMAGE
                          }}
                        />
                        <div className={cn(
                          "absolute top-2 right-2 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
                          isNaturalCapital(item) 
                            ? "bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 text-black"
                            : "bg-black/60 text-white/90"
                        )}>
                          {isNaturalCapital(item) ? 'natural capital' : 'syndicate'}
                        </div>
                      </div>
                      <div className={cn(
                        "text-center line-clamp-2",
                        variant === 'home' ? "text-sm font-medium text-white/90 mt-1" : "text-lg font-semibold text-white"
                      )}>
                        {item.name}
                      </div>
                      {variant === 'default' && (
                        <button className="w-full flex justify-center items-center py-2">
                          <PlusCircle className="w-7 h-7 stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          }
        })}
      </div>
      {variant === 'default' && displayedItems.length < sortedItems.length && (
        <div className="flex justify-center py-4">
          <Button 
            onClick={loadMore}
            variant="outline"
            className="bg-black/20 hover:bg-black/30"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
} 