import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/accounts';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

// Cache successful responses for 1 minute
export const revalidate = 60;

// Separate caches for all accounts and group-specific accounts
const CACHE_DURATION = 60 * 1000; // 1 minute
const cache = {
    all: {
        data: null as any,
        timestamp: 0
    },
    byGroup: new Map<string, { data: any, timestamp: number }>()
};

async function getAccountsWithCache(group?: string) {
    const now = Date.now();

    // If group specified, use group-specific cache and getByGroup
    if (group) {
        const groupCache = cache.byGroup.get(group);
        if (groupCache && (now - groupCache.timestamp) < CACHE_DURATION) {
            return groupCache.data;
        }
        
        const data = await accounts.getByGroup(group);
        cache.byGroup.set(group, {
            data,
            timestamp: now
        });
        return data;
    }

    // Otherwise use all accounts cache and getAll
    if (cache.all.data && (now - cache.all.timestamp) < CACHE_DURATION) {
        return cache.all.data;
    }

    const data = await accounts.getAll();
    cache.all = {
        data,
        timestamp: now
    };
    return data;
}

export async function GET(request: Request) {
    try {
        // Parse group from URL
        const { searchParams } = new URL(request.url);
        const group = searchParams.get('group');
        
        const accountData = await getAccountsWithCache(group || undefined);
        
        return NextResponse.json(accountData, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
} 