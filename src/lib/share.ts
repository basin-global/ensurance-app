import { Metadata, Viewport } from 'next'
import { sql } from '@vercel/postgres'
import { groups } from '@/lib/database/groups'
import { accounts } from '@/lib/database/accounts'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000'
}

// Convert IPFS URL to use a gateway
const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

// Generate OpenGraph image from square image
const generateOpenGraphImage = async (imageUrl: string, title: string, type: string): Promise<string> => {
  try {
    const response = await fetch(`https://ensurance.app/api/utilities/share?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(title)}&type=${type}`)
    const data = await response.json()
    return data.url || 'https://ensurance.app/assets/share-default.png'
  } catch (error) {
    console.error('Failed to generate OpenGraph image:', error)
    return 'https://ensurance.app/assets/share-default.png'
  }
}

// Base metadata for fallback
const getBaseMetadata = (): Metadata => ({
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
})

// Generate metadata for general certificates
async function getGeneralCertificateMetadata(contractAddress: string): Promise<Metadata> {
  try {
    const result = await sql`
      SELECT name, token_uri, contract_address, description
      FROM certificates.general 
      WHERE contract_address = ${contractAddress}
    `
    const certificate = result.rows[0]
    
    if (!certificate) return getBaseMetadata()

    // Fetch metadata from token URI if available
    let imageUrl = 'https://ensurance.app/assets/share-default.png'
    let description = certificate.description || `view and trade ${certificate.name} certificate on ensurance`
    
    if (certificate.token_uri) {
      try {
        const fetchUrl = convertIpfsUrl(certificate.token_uri)
        const response = await fetch(fetchUrl)
        if (response.ok) {
          const metadata = await response.json()
          if (metadata.image) {
            const squareImageUrl = convertIpfsUrl(metadata.image)
            imageUrl = await generateOpenGraphImage(squareImageUrl, certificate.name, 'certificate')
          }
          if (metadata.description) {
            description = metadata.description
          }
        }
      } catch (error) {
        console.error('Failed to fetch token metadata:', error)
      }
    }

    const title = `${certificate.name} | general ensurance`
    
    return {
      ...getBaseMetadata(),
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: certificate.name
        }],
        siteName: 'ensurance agents'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@ensurance_app',
        site: '@ensurance_app'
      }
    }
  } catch (error) {
    console.error('Error generating general certificate metadata:', error)
    return getBaseMetadata()
  }
}

// Generate metadata for specific certificates
async function getSpecificCertificateMetadata(contractAddress: string, tokenId: string): Promise<Metadata> {
  try {
    // Fetch metadata from API endpoint
    const metadataUrl = `https://ensurance.app/api/metadata/${contractAddress}/${tokenId}`
    const response = await fetch(metadataUrl)
    
    if (!response.ok) return getBaseMetadata()
    
    const metadata = await response.json()
    const name = metadata.name || `specific ensurance #${tokenId}`
    
    let imageUrl = 'https://ensurance.app/assets/share-default.png'
    if (metadata.image) {
      const squareImageUrl = convertIpfsUrl(metadata.image)
      imageUrl = await generateOpenGraphImage(squareImageUrl, name, 'specific')
    }
    const description = metadata.description || `specific ensurance certificate providing direct funding for natural capital`
    const title = `${name} | specific ensurance`
    
    return {
      ...getBaseMetadata(),
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name
        }],
        siteName: 'ensurance agents'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@ensurance_app',
        site: '@ensurance_app'
      }
    }
  } catch (error) {
    console.error('Error generating specific certificate metadata:', error)
    return getBaseMetadata()
  }
}

// Generate metadata for accounts
async function getAccountMetadata(accountName: string): Promise<Metadata> {
  try {
    const accountData = await accounts.getByFullName(accountName)
    
    if (!accountData) return getBaseMetadata()
    
    // Try to get group data for additional context
    let groupData = null
    if (accountData.group_name) {
      try {
        groupData = await groups.getByName(accountData.group_name)
      } catch (error) {
        console.warn('Failed to fetch group data for account:', error)
      }
    }
    
    // Generate image URL - use generated image if available
    let imageUrl = 'https://ensurance.app/assets/share-default.png'
    if (accountData.token_id && accountData.group_name) {
      const groupNameClean = accountData.group_name.replace(/^\./, '')
      const squareImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupNameClean}/generated/${accountData.token_id}.png`
      // Generate landscape OpenGraph version
      imageUrl = await generateOpenGraphImage(squareImageUrl, accountData.full_account_name, 'account')
    }
    
    const name = accountData.full_account_name
    const description = accountData.is_agent 
      ? `AI agent account managed by ${accountName} - reducing risk, increasing resilience`
      : `account for ${accountName} - reducing risk, increasing resilience`
    const title = `${name} | ensurance agents`
    
    return {
      ...getBaseMetadata(),
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name
        }],
        siteName: 'ensurance agents'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@ensurance_app',
        site: '@ensurance_app'
      }
    }
  } catch (error) {
    console.error('Error generating account metadata:', error)
    return getBaseMetadata()
  }
}

// Generate metadata for groups
async function getGroupMetadata(groupName: string): Promise<Metadata> {
  try {
    const groupData = await groups.getByName(`.${groupName}`)
    
    if (!groupData) return getBaseMetadata()
    
    // Use group banner as image
    const imageUrl = `https://ensurance.app/groups/banners/${groupName}-banner.jpg`
    
    const title = `${groupData.name_front || groupData.group_name} | ensurance groups`
    const description = groupData.tagline || groupData.description || `group ${groupName} - reducing risk, increasing resilience`
    
    return {
      ...getBaseMetadata(),
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: groupData.name_front || groupData.group_name
        }],
        siteName: 'ensurance agents'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@ensurance_app',
        site: '@ensurance_app'
      }
    }
  } catch (error) {
    console.error('Error generating group metadata:', error)
    return getBaseMetadata()
  }
}

// Generate metadata for syndicates
async function getSyndicateMetadata(syndicateName: string): Promise<Metadata> {
  try {
    const response = await fetch('https://ensurance.app/api/syndicates')
    if (!response.ok) return getBaseMetadata()
    
    const syndicates = await response.json()
    const syndicate = syndicates.find((s: any) => s.name === syndicateName)
    
    if (!syndicate) return getBaseMetadata()
    
    const imageUrl = syndicate.image_url || 'https://ensurance.app/assets/share-default.png'
    const title = `${syndicate.name} | ensurance syndicates`
    const description = syndicate.description || `syndicate ${syndicateName} - reducing risk, increasing resilience`
    
    return {
      ...getBaseMetadata(),
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: syndicate.name
        }],
        siteName: 'ensurance agents'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@ensurance_app',
        site: '@ensurance_app'
      }
    }
  } catch (error) {
    console.error('Error generating syndicate metadata:', error)
    return getBaseMetadata()
  }
}

// Main function to generate share metadata based on pathname
export async function generateShare(pathname: string = '/', params: any = {}): Promise<Metadata> {
  try {
    // Parse the pathname to determine content type
    const pathSegments = pathname.split('/').filter(Boolean)
    
    if (pathSegments.length === 0) {
      // Home page
      return getBaseMetadata()
    }
    
    // General certificates: /general/[contract]
    if (pathSegments[0] === 'general' && pathSegments[1]) {
      return await getGeneralCertificateMetadata(pathSegments[1])
    }
    
    // Specific certificates: /specific/[contract]/[tokenId]
    if (pathSegments[0] === 'specific' && pathSegments[1] && pathSegments[2]) {
      return await getSpecificCertificateMetadata(pathSegments[1], pathSegments[2])
    }
    
    // Groups: /groups/[group]
    if (pathSegments[0] === 'groups' && pathSegments[1]) {
      return await getGroupMetadata(pathSegments[1])
    }
    
    // Syndicates: /syndicates/[name]
    if (pathSegments[0] === 'syndicates' && pathSegments[1]) {
      return await getSyndicateMetadata(pathSegments[1])
    }
    
    // Accounts: /[account] (format: account.group)
    if (pathSegments.length === 1 && pathSegments[0].includes('.')) {
      return await getAccountMetadata(pathSegments[0])
    }
    
    // Account sub-pages: /[account]/[view]
    if (pathSegments.length === 2 && pathSegments[0].includes('.')) {
      // Use the same metadata as the main account page
      return await getAccountMetadata(pathSegments[0])
    }
    
    // For all other pages, return base metadata
    return getBaseMetadata()
    
  } catch (error) {
    console.error('Error in generateShare:', error)
    return getBaseMetadata()
  }
} 