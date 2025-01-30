import { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000'
}

export async function generateShare(pathname: string = '/', params: any = {}): Promise<Metadata> {
  // Default metadata
  const defaults = {
    title: 'ensurance agents | ensuring natural capital',
    description: 'reducing risk, increasing resilience',
    image: '/assets/share-default.png',
    keywords: 'ensurance, natural capital, ecosystem services, natural assets, environmental assets',
    type: 'website' as const
  }

  const baseMetadata = {
    metadataBase: new URL('https://ensurance.app'),
    applicationName: 'ensurance agents',
    authors: [{ name: 'BASIN Natural Capital' }],
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin' as const,
    robots: 'index, follow'
  }

  // Account pages - check if pathname has a dot (indicating name.group format)
  if (pathname.includes('.')) {
    const accountName = pathname.slice(1) // remove leading slash
    
    try {
      const headersList = headers()
      const host = headersList.get('host') || ''
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const baseUrl = `${protocol}://${host}`

      // Fetch account data including image
      const response = await fetch(`${baseUrl}/api/accounts/${accountName}`);
      const accountData = await response.json();
      
      const accountImage = accountData.image || defaults.image;

      return {
        ...baseMetadata,
        title: `${accountName} - an ensurance agent`,
        description: `${accountName} - reducing risk, increasing resilience`,
        keywords: `${defaults.keywords}, ${accountName}`,
        openGraph: {
          type: 'website' as const,
          title: `${accountName} - an ensurance agent`,
          description: `${accountName} - reducing risk, increasing resilience`,
          images: [accountImage],
          siteName: 'ensurance agents',
          locale: 'en_US'
        },
        twitter: {
          card: 'summary_large_image',
          title: `${accountName} - an ensurance agent`,
          description: `${accountName} - reducing risk, increasing resilience`,
          images: [accountImage],
          creator: '@ensurance_app',
          site: '@ensurance_app'
        }
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      // Fall back to default metadata if fetch fails
      return {
        ...baseMetadata,
        title: `${accountName} - an ensurance agent`,
        description: `${accountName} - reducing risk, increasing resilience`,
        keywords: `${defaults.keywords}, ${accountName}`,
        openGraph: {
          type: 'website' as const,
          title: `${accountName} - an ensurance agent`,
          description: `${accountName} - reducing risk, increasing resilience`,
          images: [defaults.image],
          siteName: 'ensurance agents',
          locale: 'en_US'
        },
        twitter: {
          card: 'summary_large_image',
          title: `${accountName} - an ensurance agent`,
          description: `${accountName} - reducing risk, increasing resilience`,
          images: [defaults.image],
          creator: '@ensurance_app',
          site: '@ensurance_app'
        }
      }
    }
  }

  // Group pages
  if (pathname.startsWith('/groups/')) {
    const parts = pathname.split('/')
    const group = parts[2] // groups/[group]/*
    if (group) {
      return {
        ...baseMetadata,
        title: `.${group} - an ensurance group`,
        description: `${group} group - reducing risk, increasing resilience`,
        keywords: `${defaults.keywords}, ${group}`,
        openGraph: {
          type: 'website' as const,
          title: `.${group} - an ensurance group`,
          description: `${group} group - reducing risk, increasing resilience`,
          images: [defaults.image],
          siteName: 'ensurance agents',
          locale: 'en_US'
        },
        twitter: {
          card: 'summary_large_image',
          title: `.${group} - an ensurance group`,
          description: `${group} group - reducing risk, increasing resilience`,
          images: [defaults.image],
          creator: '@ensurance_app',
          site: '@ensurance_app'
        }
      }
    }
  }

  // Certificate pages
  if (pathname.includes('/certificates/')) {
    // Extract chain and tokenId from URL if they exist
    const parts = pathname.split('/');
    const chainIndex = parts.indexOf('certificates') + 1;
    if (parts[chainIndex] && parts[chainIndex + 1]) {
      const chain = parts[chainIndex];
      const tokenId = parts[chainIndex + 1];
      
      try {
        const headersList = headers()
        const host = headersList.get('host') || ''
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
        const baseUrl = `${protocol}://${host}`

        const response = await fetch(`${baseUrl}/api/ensurance?chain=${chain}&tokenId=${tokenId}`);
        const data = await response.json();
        
        const certificateImage = data.image || defaults.image;
        
        return {
          ...baseMetadata,
          title: `${data.name} - a certificate of ensurance`,
          description: data.description || 'A certificate of ensurance',
          openGraph: {
            type: 'website' as const,
            title: `${data.name} - a certificate of ensurance`,
            description: data.description || 'A certificate of ensurance',
            images: [certificateImage],
            siteName: 'ensurance agents',
            locale: 'en_US'
          },
          twitter: {
            card: 'summary_large_image',
            title: `${data.name} - a certificate of ensurance`,
            description: data.description || 'A certificate of ensurance',
            images: [certificateImage],
            creator: '@ensurance_app',
            site: '@ensurance_app'
          }
        }
      } catch (error) {
        console.error('Error:', error);
        return {
          ...baseMetadata,
          title: 'certificate of ensurance | ensurance agents',
          openGraph: {
            type: 'website' as const,
            title: 'certificate of ensurance | ensurance agents',
            description: defaults.description,
            images: [defaults.image],
            siteName: 'ensurance agents',
            locale: 'en_US'
          },
          twitter: {
            card: 'summary_large_image',
            title: 'certificate of ensurance | ensurance agents',
            description: defaults.description,
            images: [defaults.image],
            creator: '@ensurance_app',
            site: '@ensurance_app'
          }
        }
      }
    }
    
    // Main certificates page or error case
    return {
      ...baseMetadata,
      title: 'certificates of ensurance | ensurance agents'
    }
  }

  // Default metadata for all other pages
  return {
    ...baseMetadata,
    ...defaults,
    openGraph: {
      type: 'website' as const,
      title: defaults.title,
      description: defaults.description,
      images: [defaults.image],
      siteName: 'ensurance agents',
      locale: 'en_US'
    },
    twitter: {
      card: 'summary_large_image',
      title: defaults.title,
      description: defaults.description,
      images: [defaults.image],
      creator: '@ensurance_app',
      site: '@ensurance_app'
    }
  }
} 