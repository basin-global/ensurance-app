import { accounts } from '@/lib/database/queries/accounts';
import { ensurance } from '@/lib/database/queries/ensurance/specific';
import { groups } from '@/lib/database/queries/groups';
import { searchDocs } from '@/lib/docs-search';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;

// Simple in-memory cache
let cache = {
    groups: { data: null, timestamp: 0 },
    accounts: { data: null, timestamp: 0 },
    certificates: { data: null, timestamp: 0 }
};

function isCacheValid(type: keyof typeof cache) {
    const cacheEntry = cache[type];
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < 60000;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const query = request.nextUrl.searchParams.get('q')?.toLowerCase();
        
        // Define navigation items once at the top
        const navItems = [
            {
                name: 'certificates',
                path: '/certificates/all',
                type: 'nav'
            },
            {
                name: 'syndicates',
                path: '/syndicates',
                type: 'nav'
            },
            {
                name: 'pools',
                path: '/pools',
                type: 'nav'
            },
            {
                name: 'exchange',
                path: '/exchange',
                type: 'nav'
            },
            {
                name: 'agents',
                path: '/all',
                type: 'nav'
            },
            {
                name: 'groups',
                path: '/groups',
                type: 'nav'
            },
            {
                name: 'binder',
                path: 'https://binder.ensurance.app',
                type: 'nav'
            },
            {
                name: '$ENSURE',
                path: 'https://www.coinbase.com/price/base-ensure',
                type: 'nav'
            },
            {
                name: 'docs',
                path: '/docs',
                type: 'nav'
            }
        ];
        
        // If no query, return all nav items
        if (!query) {
            return NextResponse.json(navItems);
        }

        const searchLower = query.toLowerCase();
        
        // Filter nav items that match the search
        const matchingNavItems = navItems.filter(item => 
            item.name.toLowerCase().includes(searchLower)
        );
        
        // Initialize data arrays with cached or empty values
        let groupsData = isCacheValid('groups') ? cache.groups.data : [];
        let accountsData = isCacheValid('accounts') ? cache.accounts.data : [];
        let certificatesData = isCacheValid('certificates') ? cache.certificates.data : [];

        try {
            // Only fetch what's not in cache
            if (!isCacheValid('groups')) {
                groupsData = await groups.getSearchResults();
                cache.groups = { data: groupsData, timestamp: Date.now() };
            }
        } catch (error) {
            console.error('[Search API] Failed to load groups:', error);
            groupsData = groupsData || [];
        }

        try {
            if (!isCacheValid('accounts')) {
                accountsData = await accounts.getSearchResults();
                cache.accounts = { data: accountsData, timestamp: Date.now() };
            }
        } catch (error) {
            console.error('[Search API] Failed to load accounts:', error);
            accountsData = accountsData || [];
        }

        try {
            if (!isCacheValid('certificates')) {
                certificatesData = await ensurance.getSearchResults();
                cache.certificates = { data: certificatesData, timestamp: Date.now() };
            }
        } catch (error) {
            console.error('[Search API] Failed to load certificates:', error);
            certificatesData = certificatesData || [];
        }

        // Process results in parallel with null checks
        const [matchingGroups, matchingAccounts, matchingCertificates] = await Promise.all([
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
                    is_pool: account.group_name === '.ensurance' && account.full_account_name !== 'situs.ensurance'
                })),
            certificatesData
                .filter(cert => 
                    cert.name?.toLowerCase().includes(searchLower) ||
                    cert.chain?.toLowerCase().includes(searchLower)
                )
                .map(cert => ({
                    name: cert.name || `Certificate #${cert.token_id}`,
                    path: `/certificates/${cert.chain}/${cert.token_id}`,
                    type: 'certificate'
                }))
        ]);

        // Combine all results, putting nav items first
        const results = [
            ...matchingNavItems,
            ...matchingGroups,
            ...matchingAccounts,
            ...matchingCertificates
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