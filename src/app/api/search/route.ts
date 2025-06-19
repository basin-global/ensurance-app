import { accounts } from '@/lib/database/accounts';
import { groups } from '@/lib/database/groups';
import { searchDocs } from '@/lib/docs-search';
import { NextRequest, NextResponse } from 'next/server';
import { getContractTokens } from '@/modules/specific/collect';
import { CONTRACTS } from '@/modules/specific/config';

export const revalidate = 60;

// Simple in-memory cache with stale-while-revalidate
let cache = {
    groups: { data: null, timestamp: 0, isRevalidating: false },
    accounts: { data: null, timestamp: 0, isRevalidating: false },
    general: { data: null, timestamp: 0, isRevalidating: false },
    specific: { data: null, timestamp: 0, isRevalidating: false },
    syndicates: { data: null, timestamp: 0, isRevalidating: false },
    proceeds: { data: null, timestamp: 0, isRevalidating: false },
    exposure: { data: null, timestamp: 0, isRevalidating: false }
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
        
        // Build absolute base URL for internal fetches
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host');
        const baseUrl = `${protocol}://${host}`;
        
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

        // Fetch all data types in parallel using absolute URLs
        const [
            groupsData,
            accountsData,
            generalData,
            specificData,
            syndicatesData
        ] = await Promise.all([
            getDataWithCache('groups', () => groups.getSearchResults()),
            getDataWithCache('accounts', () => accounts.getSearchResults()),
            getDataWithCache('general', () => fetch(`${baseUrl}/api/general`).then(r => r.json())),
            getDataWithCache('specific', () => getContractTokens(CONTRACTS.specific)),
            getDataWithCache('syndicates', () => fetch(`${baseUrl}/api/syndicates`).then(r => r.json()))
        ]);

        // Process results in parallel with null checks (except specific, which is handled below)
        const matchingGroups = groupsData
            .filter((group: any) => 
                (group?.group_name?.toLowerCase().includes(searchLower) ||
                group?.name_front?.toLowerCase().includes(searchLower))
            )
            .map((group: any) => ({
                name: group.name_front || group.group_name,
                path: `/groups/${group.group_name.replace(/^\\\\./, '')}/all`,
                type: 'group'
            }));
        const matchingAccounts = accountsData
            .filter((account: any) => 
                account?.full_account_name?.toLowerCase().includes(searchLower)
            )
            .map((account: any) => ({
                name: account.full_account_name,
                path: `/${account.full_account_name}`,
                type: 'account',
                is_agent: account.is_agent,
                is_ensurance: account.group_name === '.ensurance' && account.full_account_name !== 'situs.ensurance',
                token_id: account.token_id,
                tba_address: account.tba_address
            }));
        const matchingGeneral = generalData
            .filter((cert: any) => 
                cert?.name?.toLowerCase().includes(searchLower) ||
                cert?.description?.toLowerCase().includes(searchLower)
            )
            .map((cert: any) => ({
                name: cert.name,
                path: `/general/${cert.contract_address}`,
                type: 'general',
                description: cert.description
            }));
        // Specific certificates: fetch and parse metadata for each token, then filter on metadata.name/description
        const matchingSpecific = [];
        for (const token of specificData) {
            let metadata = { name: '', description: '' };
            try {
                if (token.tokenURI.startsWith('http')) {
                    const response = await fetch(token.tokenURI);
                    if (response.ok) {
                        metadata = await response.json();
                    }
                } else {
                    metadata = JSON.parse(token.tokenURI);
                }
            } catch (err) {
                // fallback: skip this token if metadata can't be loaded
                continue;
            }
            if (
                metadata.name?.toLowerCase().includes(searchLower) ||
                metadata.description?.toLowerCase().includes(searchLower)
            ) {
                matchingSpecific.push({
                    name: metadata.name || 'Unnamed Token',
                    path: `/specific/${CONTRACTS.specific}/${token.tokenURI.split('/').pop()}`,
                    type: 'specific',
                    description: metadata.description || ''
                });
            }
        }
        const matchingSyndicates = syndicatesData
            .filter((syndicate: any) => 
                syndicate?.name?.toLowerCase().includes(searchLower) ||
                syndicate?.description?.toLowerCase().includes(searchLower)
            )
            .map((syndicate: any) => ({
                name: syndicate.name,
                path: `/syndicates/${syndicate.name.toLowerCase().replace(/\s+/g, '-')}`,
                type: 'syndicate',
                description: syndicate.description
            }));

        // Combine all results, putting nav items first
        const results = [
            ...matchingNavItems,
            ...matchingGroups,
            ...matchingAccounts,
            ...matchingGeneral,
            ...matchingSpecific,
            ...matchingSyndicates
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