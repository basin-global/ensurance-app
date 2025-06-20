import { accounts } from '@/lib/database/accounts';
import { groups } from '@/lib/database/groups';
import { NextRequest, NextResponse } from 'next/server';
import { getContractTokens } from '@/modules/specific/collect';
import { CONTRACTS } from '@/modules/specific/config';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

// Simple in-memory cache with stale-while-revalidate (copied from search API)
let cache = {
    groups: { data: null, timestamp: 0, isRevalidating: false },
    accounts: { data: null, timestamp: 0, isRevalidating: false },
    general: { data: null, timestamp: 0, isRevalidating: false },
    specific: { data: null, timestamp: 0, isRevalidating: false },
    syndicates: { data: null, timestamp: 0, isRevalidating: false }
};

// Separate cache for individual metadata entries (more granular)
let metadataCache: Record<string, { data: any, timestamp: number }> = {};

const CACHE_TTL = 60000; // 1 minute
const STALE_TTL = 300000; // 5 minutes

function isCacheValid(type: keyof typeof cache) {
    const cacheEntry = cache[type];
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
}

async function getDataWithCache(type: keyof typeof cache, fetchFn: () => Promise<any>) {
    const cacheEntry = cache[type];
    
    // Return fresh cache
    if (isCacheValid(type)) {
        return cacheEntry.data;
    }
    
    // Return stale cache and revalidate in background
    if (cacheEntry.data && !cacheEntry.isRevalidating) {
        cacheEntry.isRevalidating = true;
        fetchFn().then(newData => {
            cache[type] = { data: newData, timestamp: Date.now(), isRevalidating: false };
        }).catch(error => {
            console.error(`Background revalidation failed for ${type}:`, error);
            cacheEntry.isRevalidating = false;
        });
        return cacheEntry.data;
    }
    
    // No cache or stale cache, fetch new data
    try {
        const newData = await fetchFn();
        cache[type] = { data: newData, timestamp: Date.now(), isRevalidating: false };
        return newData;
    } catch (error) {
        console.error(`Failed to fetch ${type}:`, error);
        return cacheEntry.data || []; // Return stale data if available, empty array if not
    }
}

export async function GET(request: NextRequest) {
    try {
        // Check if metadata is requested separately
        const includeMetadata = request.nextUrl.searchParams.get('metadata') !== 'false';
        
        // Build absolute base URL for internal fetches
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        // Fetch all data types in parallel using the same caching as search API
        const [
            groupsData,
            accountsData,
            generalData,
            specificData,
            syndicatesData
        ] = await Promise.all([
            getDataWithCache('groups', () => groups.getAll()),
            getDataWithCache('accounts', () => accounts.getAll()),
            getDataWithCache('general', () => fetch(`${baseUrl}/api/general`).then(r => r.json())),
            getDataWithCache('specific', () => getContractTokens(CONTRACTS.specific)),
            getDataWithCache('syndicates', () => fetch(`${baseUrl}/api/syndicates`).then(r => r.json()))
        ]);

        // Transform data to match EnsureMagnet expectations
        const generalCertificates = await Promise.all(
            (generalData || [])
                .filter((cert: any) => cert && cert.contract_address)
                .map(async (cert: any) => {
                    let image_url = cert.image_url;
                    
                    // If no image_url, try to fetch from our image utility
                    if (!image_url) {
                        try {
                            const imageResponse = await fetch(`${baseUrl}/api/utilities/image?address=${cert.contract_address}&tokenType=erc20`);
                            if (imageResponse.ok) {
                                const imageData = await imageResponse.json();
                                image_url = imageData.url;
                            }
                        } catch (error) {
                            console.error(`Failed to fetch image for ${cert.contract_address}:`, error);
                        }
                    }
                    
                    return {
                        contract_address: cert.contract_address,
                        name: cert.name,
                        description: cert.description,
                        image_url: image_url || '/assets/no-image-found.png',
                        type: 'general' as const
                    };
                })
        );

        const specificCertificates = (specificData || []).map((token: any) => ({
            tokenURI: token.tokenURI,
            type: 'specific' as const
        }));

        const accountsWithType = (accountsData || []).map((account: any) => ({
            full_account_name: account.full_account_name,
            token_id: account.token_id,
            group_name: account.group_name,
            is_agent: account.is_agent,
            description: account.description,
            type: 'account' as const
        }));

        const groupsWithType = (groupsData || [])
            .filter((group: any) => group.is_active)
            .map((group: any) => ({
                group_name: group.group_name,
                name_front: group.name_front,
                tagline: group.tagline,
                description: group.description,
                type: 'group' as const
            }));

        const syndicatesWithType = (syndicatesData || []).map((syndicate: any) => ({
            name: syndicate.name,
            description: syndicate.description,
            media: syndicate.media,
            image_url: syndicate.image_url,
            type: 'syndicate' as const
        }));

        // Combine all items
        const allItems = [
            ...generalCertificates,
            ...specificCertificates,
            ...accountsWithType,
            ...groupsWithType,
            ...syndicatesWithType
        ];

        // If metadata not requested, return immediately
        if (!includeMetadata) {
            return NextResponse.json({
                items: allItems,
                tokenMetadata: {}
            });
        }

        // Fetch metadata for specific certificates using granular cache
        const tokenMetadata: Record<string, any> = {};
        if (specificCertificates.length > 0) {
            await Promise.all(
                specificCertificates.map(async (token: any) => {
                    const tokenURI = token.tokenURI;
                    
                    // Check individual metadata cache
                    const cached = metadataCache[tokenURI];
                    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                        tokenMetadata[tokenURI] = cached.data;
                        return;
                    }
                    
                    try {
                        let metadata;
                        if (tokenURI.startsWith('http')) {
                            const response = await fetch(tokenURI);
                            if (response.ok) {
                                metadata = await response.json();
                            } else {
                                throw new Error('Failed to fetch metadata');
                            }
                        } else {
                            metadata = JSON.parse(tokenURI);
                        }
                        
                        // Cache individual metadata entry
                        metadataCache[tokenURI] = { data: metadata, timestamp: Date.now() };
                        tokenMetadata[tokenURI] = metadata;
                    } catch (error) {
                        console.error(`Error fetching metadata for ${tokenURI}:`, error);
                        const errorData = { error: true };
                        metadataCache[tokenURI] = { data: errorData, timestamp: Date.now() };
                        tokenMetadata[tokenURI] = errorData;
                    }
                })
            );
        }

        return NextResponse.json({
            items: allItems,
            tokenMetadata
        });

    } catch (error) {
        console.error('[Ensure API] Error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch ensure data',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 