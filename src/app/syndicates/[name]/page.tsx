'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/PageHeader'

interface SyndicateDetails {
  name: string;
  tagline: string;
  description: string | null;
  asset_address: string;
  chain: string;
  natural_capital_stocks: string[];
  natural_capital_flows: string[];
  nat_cap_rate: string | number;
  image_url: string;
  media?: {
    banner?: string;
  }
}

export default function SyndicateDetailsPage() {
  const params = useParams()
  // Keep the hyphenated version for the API query
  const syndicateName = params.name as string;
  
  const [syndicate, setSyndicate] = useState<SyndicateDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchSyndicateDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/syndicates?name=${syndicateName}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch syndicate details')
        }
        
        const data = await response.json()
        if (data && data.length > 0) {
          setSyndicate(data[0])
        } else {
          setError('Syndicate not found')
        }
      } catch (err) {
        console.error('Error fetching syndicate details:', err)
        setError('Failed to load syndicate details')
      } finally {
        setLoading(false)
      }
    }
    
    if (syndicateName) {
      fetchSyndicateDetails()
    }
  }, [syndicateName])
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageHeader title="ensurance syndicate" showSearch={false} />
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-[30vh] min-h-[300px] w-full rounded-lg mb-6" />
          <Skeleton className="h-10 w-3/4 mb-3" />
          <Skeleton className="h-5 w-full mb-2" />
        </div>
      </div>
    )
  }
  
  if (error || !syndicate) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageHeader title="ensurance syndicate" showSearch={false} />
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-3">Error</h2>
                <p>{error || 'Failed to load syndicate details'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // Get banner image from media.banner or fallback to image_url
  const bannerImage = syndicate.media?.banner || syndicate.image_url || '/assets/ensurance-example.png';
  
  console.log('Syndicate data:', {
    name: syndicate.name,
    bannerImage,
    media: syndicate.media,
    image_url: syndicate.image_url
  });
  
  return (
    <div className="flex flex-col">
      {/* Hero Section with Banner */}
      <div className="relative h-[60vh] min-h-[500px]">
        <Image
          src={bannerImage}
          alt={`${syndicate.name} Banner`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          quality={95}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = '/assets/ensurance-example.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col">
          <Link href="/syndicates" className="block">
            <div className="flex justify-center items-center gap-3 group pt-8">
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
              <PageHeader 
                title="ensurance syndicates"
                showSearch={false}
              />
            </div>
          </Link>
          
          {/* Title Content */}
          <div className="container mx-auto px-4 pb-12 mt-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold text-white tracking-tight lowercase">
                  {syndicate.name}
                </h1>
                <p className="text-xl text-white/85 font-normal leading-relaxed lowercase">
                  {syndicate.tagline}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Top Stats */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm text-white/90 font-medium tracking-wide lowercase">
              natural cap rate: {syndicate.nat_cap_rate}%
            </span>
            <a 
              href={`mailto:tmo@basin.global?subject=Join Waitlist: ${syndicate.name}&body=Hi, I'm interested in joining the waitlist for the ${syndicate.name} syndicate.%0D%0A%0D%0ASyndicate: ${syndicate.name}`}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-full text-sm text-white/90 font-medium tracking-wide lowercase transition-all duration-300"
            >
              join waitlist
            </a>
          </div>

          {/* Description */}
          {syndicate.description && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-white/85 lowercase">{syndicate.description}</p>
            </div>
          )}

          {/* Natural Capital Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white tracking-tight lowercase mb-6">
                natural capital stocks
              </h3>
              <div className="flex flex-wrap gap-2">
                {syndicate.natural_capital_stocks.map((stock, index) => (
                  <span key={index} className="px-4 py-2 text-sm bg-white/10 backdrop-blur-sm rounded-full text-white/90 font-medium tracking-wide lowercase">
                    {stock}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white tracking-tight lowercase mb-6">
                natural capital flows
              </h3>
              <div className="flex flex-wrap gap-2">
                {syndicate.natural_capital_flows.map((flow, index) => (
                  <span key={index} className="px-4 py-2 text-sm bg-white/10 backdrop-blur-sm rounded-full text-white/90 font-medium tracking-wide lowercase">
                    {flow}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}