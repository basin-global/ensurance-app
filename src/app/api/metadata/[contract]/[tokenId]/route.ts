import { NextResponse } from 'next/server';
import { metadata } from '@/lib/database/metadata';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { contract: string; tokenId: string } }
) {
    try {
        console.log('Metadata request for:', {
            contract: params.contract,
            tokenId: params.tokenId
        });
        
        const nftMetadata = await metadata.getByContractAndToken(params.contract, params.tokenId);
        
        console.log('Metadata generated:', nftMetadata);
        return NextResponse.json(nftMetadata);
    } catch (error) {
        console.error('Metadata API error:', {
            contract: params.contract,
            tokenId: params.tokenId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get metadata' },
            { status: 500 }
        );
    }
} 