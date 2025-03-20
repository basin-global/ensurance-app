'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/PageHeader'

interface SyndicateDetails {
  id: string
  name: string
  description: string
  strategy: string
  asset_address: string
  chain: string
  impact_tags: string[]
  currency: string
  image_url: string
  media?: {
    banner?: string
  }
}

export default function SyndicateDetailsPage() {
  const params = useParams()
  const contractAddress = params.contract as string
  
  const [syndicate, setSyndicate] = useState<SyndicateDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchSyndicateDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/syndicates?id=${contractAddress}`)
        
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
    
    if (contractAddress) {
      fetchSyndicateDetails()
    }
  }, [contractAddress])
  
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
  const bannerImage = syndicate.media?.banner || syndicate.image_url;
  
  return (
    <div className="flex flex-col">
      {/* Hero Section with Banner */}
      <div className="relative h-[50vh] min-h-[400px]">
        <Image
          src={bannerImage}
          alt={`${syndicate.name} Banner`}
          fill
          className="object-cover brightness-90"
          priority
          sizes="100vw"
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 pt-8">
            <PageHeader 
              title="ensurance syndicate" 
              showSearch={false} 
            />
          </div>
          
          {/* Title Content */}
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-3 text-white">
                {syndicate.name}
              </h1>
              
              <div className="flex flex-wrap gap-2">
                {syndicate.impact_tags?.map((tag, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center rounded-full border border-gray-600 bg-black/40 px-2.5 py-0.5 text-sm font-medium text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Description */}
          {syndicate.description && (
            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="text-base leading-relaxed">{syndicate.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50 rounded-xl p-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Asset Details</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-400">Chain</dt>
                  <dd className="capitalize">{syndicate.chain}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-400">Asset</dt>
                  <dd>{syndicate.currency}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contract Details</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-400">Syndicate Address</dt>
                  <dd className="font-mono text-sm break-all">{syndicate.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-400">Asset Address</dt>
                  <dd className="font-mono text-sm break-all">{syndicate.asset_address}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex justify-center">
            <a 
              href={`mailto:tmo@basin.global?subject=Join Waitlist: ${syndicate.name}&body=Hi, I'm interested in joining the waitlist for the ${syndicate.name} syndicate.%0D%0A%0D%0ASyndicate ID: ${syndicate.id}`}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 w-full md:w-auto md:min-w-[200px] text-center"
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}