import { put } from '@vercel/blob'
import { TokenMetadata } from './config/ERC1155'

const BLOB_DIR = 'specific-ensurance'
const BLOB_BASE_URL = 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com'

export interface SpecificMetadata extends TokenMetadata {
  animation_url?: string
  content?: {
    mime: string
    uri: string
  }
}

/**
 * Handles media storage for specific certificates
 */
export const specificMetadata = {
  /**
   * Upload media file (image, video, audio) to Vercel Blob
   * @param file The file to upload
   * @param tokenId The token ID (use '0' for contract image)
   * @param thumbnail Optional thumbnail image for video files
   * @returns The URL of the uploaded file
   */
  async uploadMedia(
    file: File, 
    tokenId: string,
    thumbnail?: File
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    // Get file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const validExts = ['png', 'jpg', 'jpeg', 'gif', 'mp4']
    
    if (!validExts.includes(ext)) {
      throw new Error('Invalid file type. Supported: PNG, JPG, GIF, MP4')
    }

    const isVideo = ext === 'mp4'

    // Upload main file
    const { url } = await put(`${BLOB_DIR}/${tokenId}.${ext}`, file, {
      access: 'public',
      addRandomSuffix: false
    })

    // For videos, handle thumbnail
    if (isVideo) {
      if (!thumbnail) {
        throw new Error('Thumbnail image required for video files')
      }

      const thumbExt = thumbnail.name.split('.').pop()?.toLowerCase() || ''
      if (!['png', 'jpg', 'jpeg'].includes(thumbExt)) {
        throw new Error('Thumbnail must be PNG or JPG')
      }

      const { url: thumbnailUrl } = await put(
        `${BLOB_DIR}/${tokenId}-thumb.${thumbExt}`, 
        thumbnail,
        {
          access: 'public',
          addRandomSuffix: false
        }
      )

      return { url, thumbnailUrl }
    }

    return { url }
  },

  /**
   * Get the metadata URL for a token
   */
  getMetadataUrl(tokenId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/specific/${tokenId}`
  },

  /**
   * Get the expected blob URLs for a token's media
   */
  getMediaUrls(tokenId: string, ext: string): {
    mediaUrl: string
    thumbnailUrl?: string 
  } {
    const mediaUrl = `${BLOB_BASE_URL}/${BLOB_DIR}/${tokenId}.${ext}`
    
    if (ext === 'mp4') {
      return {
        mediaUrl,
        thumbnailUrl: `${BLOB_BASE_URL}/${BLOB_DIR}/${tokenId}-thumb.png`
      }
    }

    return { mediaUrl }
  }
} 