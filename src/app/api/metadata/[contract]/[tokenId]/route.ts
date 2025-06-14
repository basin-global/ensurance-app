import { NextResponse } from 'next/server';
import { metadata } from '@/lib/database/metadata';
import { CONTRACTS } from '@/modules/specific/config';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

// Constants for blob storage
const BLOB_BASE_URL = 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com';
const BLOB_DIR = 'specific-ensurance';

// Helper to get fallback image URL
const getFallbackImageUrl = () => `${BLOB_BASE_URL}/${BLOB_DIR}/0.png`;

export async function GET(
    request: Request,
    { params }: { params: { contract: string; tokenId: string } }
) {
    try {
        console.log('Metadata request for:', {
            contract: params.contract,
            tokenId: params.tokenId
        });
        
        // Check if this is a specific certificate contract
        const isSpecificContract = params.contract.toLowerCase() === CONTRACTS.specific.toLowerCase();
        
        if (isSpecificContract) {
            console.log('Handling specific certificate metadata request');
        } else {
            console.log('Handling group account metadata request');
        }
        
        const nftMetadata = await metadata.getByContractAndToken(params.contract, params.tokenId);
        
        if (nftMetadata.error) {
            console.error('Metadata error:', nftMetadata.error);
            return NextResponse.json(
                { error: nftMetadata.error },
                { status: nftMetadata.status || 500 }
            );
        }

        // If this is a specific certificate and the image is from our blob storage,
        // ensure we have a valid image URL
        if (isSpecificContract && nftMetadata.image?.startsWith(BLOB_BASE_URL)) {
            // If the image URL is for a specific token, use it
            // Otherwise, use the fallback image
            const tokenId = params.tokenId;
            if (!tokenId || tokenId === '0') {
                nftMetadata.image = getFallbackImageUrl();
                nftMetadata.animation_url = getFallbackImageUrl();
            }
        }
        
        console.log('Metadata generated:', nftMetadata);
        return NextResponse.json(nftMetadata, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    } catch (error) {
        console.error('Metadata API error:', {
            contract: params.contract,
            tokenId: params.tokenId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get metadata' },
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            }
        );
    }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
} 