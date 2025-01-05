import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/queries/accounts';

// Cache successful responses for 1 minute
export const revalidate = 60;

// Simple in-memory cache
const CACHE_DURATION = 60 * 1000; // 1 minute
let accountsCache = {
    data: null as any,
    timestamp: 0
};

async function getAccountsWithCache() {
    if (accountsCache.data && (Date.now() - accountsCache.timestamp) < CACHE_DURATION) {
        return accountsCache.data;
    }

    const data = await accounts.getAll();
    accountsCache = {
        data,
        timestamp: Date.now()
    };
    return data;
}

export async function GET() {
    try {
        const allAccounts = await getAccountsWithCache();
        
        return NextResponse.json(allAccounts, {
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