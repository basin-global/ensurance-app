import { Metadata } from 'next'

export async function generateShare(pathname: string = '/', params: any = {}): Promise<Metadata> {
  // Default metadata
  const defaults = {
    title: 'ensurance agents',
    description: 'Ensuring the stocks & flows of natural capital',
    image: '/assets/share-default.png'
  }

  const baseMetadata = {
    metadataBase: new URL('https://ensurance.app')
  }

  // Certificate pages
  if (pathname && pathname.includes('/certificates/')) {
    try {
      const response = await fetch(
        `https://ensurance.app/api/ensurance?chain=${params.chain}&tokenId=${params.tokenId}`,
        { next: { revalidate: 3600 } }
      )
      const data = await response.json()
      
      return {
        ...baseMetadata,
        title: `Certificate #${params.tokenId}`,
        description: data.description || 'View this ensurance certificate',
        openGraph: {
          title: `Certificate #${params.tokenId} | ensurance agents`,
          description: data.description || 'View this ensurance certificate',
          images: data.image_ipfs ? [`https://ipfs.io/ipfs/${data.image_ipfs}`] : [defaults.image]
        },
        twitter: {
          card: 'summary_large_image',
          title: `Certificate #${params.tokenId} | ensurance agents`,
          description: data.description || 'View this ensurance certificate',
          images: data.image_ipfs ? [`https://ipfs.io/ipfs/${data.image_ipfs}`] : [defaults.image]
        }
      }
    } catch (error) {
      console.error('Error fetching certificate data:', error)
      // Return default metadata on error
      return {
        ...baseMetadata,
        ...defaults,
        openGraph: {
          title: defaults.title,
          description: defaults.description,
          images: [defaults.image]
        },
        twitter: {
          card: 'summary_large_image',
          title: defaults.title,
          description: defaults.description,
          images: [defaults.image]
        }
      }
    }
  }

  // Add more page types here
  // if (pathname.includes('/pools/')) { ... }
  // if (pathname.includes('/accounts/')) { ... }

  // Default metadata for all other pages
  return {
    ...baseMetadata,
    title: defaults.title,
    description: defaults.description,
    openGraph: {
      title: defaults.title,
      description: defaults.description,
      images: [defaults.image]
    },
    twitter: {
      card: 'summary_large_image',
      title: defaults.title,
      description: defaults.description,
      images: [defaults.image]
    }
  }
} 