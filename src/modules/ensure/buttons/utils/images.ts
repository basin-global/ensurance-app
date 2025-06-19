const CACHE_KEY = 'token_images_cache'
const CACHE_EXPIRY = 3600000 // 1 hour in milliseconds

interface CachedImage {
  url: string
  timestamp: number
}

/**
 * Get token image from localStorage cache
 */
export const getImageFromCache = (address: string): string | null => {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    if (!cache) return null

    const images = JSON.parse(cache) as Record<string, CachedImage>
    const cached = images[address]

    if (!cached) return null

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      return null
    }

    return cached.url
  } catch (error) {
    console.error('Error reading from image cache:', error)
    return null
  }
}

/**
 * Save token image to localStorage cache
 */
export const saveImageToCache = (address: string, url: string): void => {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    const images = cache ? JSON.parse(cache) : {}
    
    images[address] = {
      url,
      timestamp: Date.now()
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(images))
  } catch (error) {
    console.error('Error saving to image cache:', error)
  }
}

/**
 * Fetch token image from API
 */
export const fetchTokenImage = async (address: string): Promise<string | null> => {
  // Check cache first
  const cached = getImageFromCache(address)
  if (cached) return cached

  try {
    const response = await fetch(`/api/utilities/image?address=${address}`)
    const data = await response.json()
    if (data.url) {
      // Save to cache
      saveImageToCache(address, data.url)
      return data.url
    }
  } catch (error) {
    console.error('Error fetching token image:', error)
  }
  return null
}

/**
 * Get default image based on token type
 */
export const getDefaultTokenImage = (): string => {
  return '/assets/no-image-found.png'
}

/**
 * Batch fetch images for multiple tokens
 */
export const batchFetchTokenImages = async (
  addresses: string[],
  onProgress?: (address: string, url: string | null) => void
): Promise<Record<string, string | null>> => {
  const results: Record<string, string | null> = {}
  
  // Process in batches of 5 to avoid overwhelming the API
  const batchSize = 5
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize)
    
    // Fetch images in parallel for this batch
    const batchPromises = batch.map(async (address) => {
      const url = await fetchTokenImage(address)
      results[address] = url
      if (onProgress) {
        onProgress(address, url)
      }
      return { address, url }
    })

    await Promise.all(batchPromises)
  }

  return results
}
