import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { CONTRACTS } from '@/modules/specific/config';
import type { SpecificMetadata } from '@/modules/specific/types';

// Blob storage configuration
const BLOB_DIR = 'specific-ensurance';
const BLOB_BASE_URL = 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com';

// URL generation helpers
const getMetadataUrl = (tokenId: string) => 
  `https://ensurance.app/api/metadata/${CONTRACTS.specific}/${tokenId}`;

const getMediaUrl = (tokenId: string) => 
  `${BLOB_BASE_URL}/${BLOB_DIR}/${tokenId}.png`;

// Simple function to get image URL with fallback
const getImageUrl = (tokenId: string) => {
  // If tokenId is 0 or invalid, use fallback
  if (!tokenId || tokenId === '0') {
    return `${BLOB_BASE_URL}/${BLOB_DIR}/0.png`;
  }
  return getMediaUrl(tokenId);
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tokenId = formData.get('tokenId') as string;
    const metadata = JSON.parse(formData.get('metadata') as string) as {
      contract_address: string;
      name: string;
      description: string;
    };

    if (!file || !tokenId || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate contract address
    if (metadata.contract_address.toLowerCase() !== CONTRACTS.specific.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid contract address' },
        { status: 400 }
      );
    }

    // Upload file to blob storage
    const { url: mediaUrl } = await put(`${BLOB_DIR}/${tokenId}.png`, file, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // Get the image URL
    const imageUrl = getImageUrl(tokenId);

    // Prepare metadata for storage
    const specificMetadata: SpecificMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: imageUrl,
      animation_url: imageUrl,
      content: {
        mime: file.type,
        uri: imageUrl
      }
    };

    // Store metadata in database
    await sql`
      INSERT INTO certificates.specific (
        token_id,
        name,
        description,
        chain,
        image,
        animation_url,
        mime_type
      ) VALUES (
        ${Number(tokenId)},
        ${specificMetadata.name},
        ${specificMetadata.description},
        'base',
        ${specificMetadata.image},
        ${specificMetadata.animation_url},
        ${specificMetadata.content?.mime || 'image/png'}
      )
    `;

    return NextResponse.json({ 
      success: true,
      mediaUrl,
      metadataUrl: getMetadataUrl(tokenId)
    });
  } catch (error) {
    console.error('Error in specific certificate creation:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
} 