import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { specificContract } from '@/modules/specific/config/ERC1155';
import type { SpecificMetadata } from '@/modules/specific/types';

// Blob storage configuration
const BLOB_DIR = 'specific-ensurance';
const BLOB_BASE_URL = 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com';

// URL generation helpers
const getMetadataUrl = (tokenId: string) => 
  `/api/metadata/${specificContract.address}/${tokenId}`;

const getMediaUrl = (tokenId: string) => 
  `${BLOB_BASE_URL}/${BLOB_DIR}/${tokenId}.png`;

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

    // Validate file type
    if (file.type !== 'image/png') {
      return NextResponse.json(
        { error: 'Only PNG images are supported' },
        { status: 400 }
      );
    }

    // Validate contract address
    if (metadata.contract_address.toLowerCase() !== specificContract.address.toLowerCase()) {
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

    // Prepare metadata for storage
    const specificMetadata: SpecificMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: mediaUrl,
      animation_url: mediaUrl,
      content: {
        mime: file.type,
        uri: mediaUrl
      }
    };

    // Store metadata in database
    await sql`
      INSERT INTO certificates.specific (
        token_id,
        contract_address,
        chain,
        name,
        description,
        image,
        animation_url,
        mime_type
      ) VALUES (
        ${Number(tokenId)},
        ${metadata.contract_address},
        'base',
        ${specificMetadata.name},
        ${specificMetadata.description},
        ${specificMetadata.image},
        ${specificMetadata.animation_url},
        ${specificMetadata.content?.mime || null}
      )
      ON CONFLICT (token_id, contract_address) 
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        animation_url = EXCLUDED.animation_url,
        mime_type = EXCLUDED.mime_type,
        updated_at = NOW()
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