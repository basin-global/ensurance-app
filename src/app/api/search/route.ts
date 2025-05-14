import { accounts } from '@/lib/database/accounts';
import { groups } from '@/lib/database/groups';
import { searchDocs } from '@/lib/docs-search';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;

// Simple in-memory cache with stale-while-revalidate
let cache = {
    groups: { data: null, timestamp: 0, isRevalidating: false },
    accounts: { data: null, timestamp: 0, isRevalidating: false }
};

const CACHE_TTL = 60000; // 1 minute
const STALE_TTL = 300000; // 5 minutes

function isCacheValid(type: keyof typeof cache) {
    const cacheEntry = cache[type];
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
}

function isCacheStale(type: keyof typeof cache) {
    const cacheEntry = cache[type];
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) > STALE_TTL;
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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const query = request.nextUrl.searchParams.get('q')?.toLowerCase();
        
        // Define navigation items once at the top
        const navItems = [
            {
                name: 'natural capital',
                path: '/natural-capital',
                type: 'nav'
            },
            {
                name: 'markets',
                path: '/markets',
                type: 'nav'
            },
            {
                name: 'groups',
                path: '/groups',
                type: 'nav'
            },
            {
                name: 'agent accounts',
                path: '/agents',
                type: 'nav'
            },
            {
                name: 'syndicates',
                path: '/syndicates',
                type: 'nav'
            },
            {
                name: 'proceeds',
                path: '/proceeds',
                type: 'nav'
            },
            {
                name: 'binder',
                path: 'https://binder.ensurance.app',
                type: 'nav'
            },
            {
                name: 'docs',
                path: '/docs',
                type: 'nav'
            }
        ];
        
        // If no query, return only nav items
        if (!query) {
            return NextResponse.json(navItems);
        }

        const searchLower = query.toLowerCase();
        
        // Filter nav items that match the search
        const matchingNavItems = navItems.filter(item => 
            item.name.toLowerCase().includes(searchLower)
        );

        // Only fetch and search other data if we have a search query
        let groupsData: { group_name: string; name_front: string | null }[] = [];
        let accountsData: { full_account_name: string; is_agent: boolean; group_name: string }[] = [];

        // Initialize from cache if valid
        groupsData = await getDataWithCache('groups', () => groups.getSearchResults());
        accountsData = await getDataWithCache('accounts', () => accounts.getSearchResults());

        // Process results in parallel with null checks
        const [matchingGroups, matchingAccounts] = await Promise.all([
            groupsData
                .filter(group => 
                    (group?.group_name?.toLowerCase().includes(searchLower) ||
                    group?.name_front?.toLowerCase().includes(searchLower))
                )
                .map(group => ({
                    name: group.name_front || group.group_name,
                    path: `/groups/${group.group_name.replace(/^\./, '')}/all`,
                    type: 'group'
                })),
            accountsData
                .filter(account => 
                    account?.full_account_name?.toLowerCase().includes(searchLower)
                )
                .map(account => ({
                    name: account.full_account_name,
                    path: `/${account.full_account_name}`,
                    type: 'account',
                    is_agent: account.is_agent,
                    is_ensurance: account.group_name === '.ensurance' && account.full_account_name !== 'situs.ensurance'
                }))
        ]);

        // Combine all results, putting nav items first
        const results = [
            ...matchingNavItems,
            ...matchingGroups,
            ...matchingAccounts
        ];

        // Add docs results to the combined results
        const docsResults = searchDocs(query);
        results.push(...docsResults);

        return NextResponse.json(results);
    } catch (error) {
        console.error('[Search API] Error:', error);
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
} 