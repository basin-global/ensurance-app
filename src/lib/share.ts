import { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000'
}

export async function generateShare(pathname: string = '/', params: any = {}): Promise<Metadata> {
  const baseMetadata = {
    metadataBase: new URL('https://ensurance.app'),
    title: 'ensurance: markets for what matters - ensuring the stocks & flows of natural capital',
    description: 'reducing risk, increasing resilience',
    applicationName: 'ensurance agents',
    authors: [{ name: 'BASIN Natural Capital' }],
    openGraph: {
      type: 'website',
      title: 'ensurance: markets for what matters - ensuring the stocks & flows of natural capital',
      description: 'reducing risk, increasing resilience',
      images: [{
        url: 'https://ensurance.app/assets/share-default.png',
        width: 1200,
        height: 630,
        alt: 'ensurance agents'
      }],
      siteName: 'ensurance agents'
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ensurance: markets for what matters - ensuring the stocks & flows of natural capital',
      description: 'reducing risk, increasing resilience',
      images: ['https://ensurance.app/assets/share-default.png'],
      creator: '@ensurance_app',
      site: '@ensurance_app'
    }
  }

  // Just return the base metadata - no API calls or complex logic
  return baseMetadata
} 