import { NextResponse } from 'next/server';
import { metadata } from '@/lib/database/metadata';

export async function GET(
    request: Request,
    { params }: { params: { contract: string; tokenId: string } }
) {
    try {
        const nftMetadata = await metadata.getByContractAndToken(params.contract, params.tokenId);
        return NextResponse.json(nftMetadata);
    } catch (error) {
        console.error('Metadata API error:', error);
        return NextResponse.json(
            { error: 'Failed to get metadata' },
            { status: 500 }
        );
    }
} 