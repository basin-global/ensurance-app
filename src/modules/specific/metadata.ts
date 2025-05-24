import { put } from '@vercel/blob'
import { TokenMetadata, specificContract } from './config/ERC1155'
import { sql } from '@vercel/postgres'

const BLOB_DIR = 'specific-ensurance'
const BLOB_BASE_URL = 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com'

export interface SpecificMetadata extends TokenMetadata {
  image: string
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
   * Upload media file to Vercel Blob
   * @param file The file to upload (must be PNG)
   * @param tokenId The token ID (use '0' for contract image)
   * @returns The URL of the uploaded file
   */
  async uploadMedia(
    file: File, 
    tokenId: string
  ): Promise<{ url: string }> {
    // Validate file type
    if (file.type !== 'image/png') {
      throw new Error('Only PNG images are supported')
    }

    // Create form data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tokenId', tokenId)

    // Upload file via API route
    const response = await fetch('/api/blob/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }

    const { url } = await response.json()
    return { url }
  },

  /**
   * Store metadata in database
   */
  async storeMetadata(
    tokenId: string,
    metadata: SpecificMetadata
  ): Promise<void> {
    await sql`
      INSERT INTO certificates.specific (
        token_id,
        chain,
        name,
        description,
        image,
        animation_url,
        mime_type
      ) VALUES (
        ${Number(tokenId)},
        ${specificContract.network.name.toLowerCase()},
        ${metadata.name},
        ${metadata.description || null},
        ${metadata.image},
        ${metadata.animation_url || null},
        ${metadata.content?.mime || 'image/png'}
      )
    `
  },

  /**
   * Get the metadata URL for a token
   */
  getMetadataUrl(tokenId: string): string {
    return `/api/metadata/${specificContract.address}/${tokenId}`
  },

  /**
   * Get the expected blob URL for a token's media
   */
  getMediaUrl(tokenId: string): string {
    return `${BLOB_BASE_URL}/${BLOB_DIR}/${tokenId}.png`
  }
} 