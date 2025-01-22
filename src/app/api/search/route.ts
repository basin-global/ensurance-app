import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { groups } from '@/lib/database/queries/groups';
import { accounts } from '@/lib/database/queries/accounts';
import { ensurance } from '@/lib/database/queries/ensurance';

// Cache successful responses for 1 minute
export const revalidate = 60;

// Simple in-memory cache
const CACHE_DURATION = 60 * 1000; // 1 minute
let cache = {
    groups: { data: null, timestamp: 0 },
    accounts: { data: null, timestamp: 0 },
    certificates: { data: null, timestamp: 0 }
};

function isCacheValid(type: keyof typeof cache) {
    const cacheEntry = cache[type];
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const query = request.nextUrl.searchParams.get('q')?.toLowerCase();
        
        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const searchLower = query.toLowerCase();
        
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
            // Use empty array or cached data if available
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
                    (group?.og_name?.toLowerCase().includes(searchLower) ||
                    group?.name_front?.toLowerCase().includes(searchLower))
                )
                .map(group => ({
                    name: group.name_front || group.og_name,
                    path: `/groups/${group.og_name.replace(/^\./, '')}/all`,
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
                    is_pool: account.og_name === '.ensurance' && account.full_account_name !== 'situs.ensurance' // All .ensurance accounts are pools except situs.ensurance
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

        // Combine and sort results
        const results = [
            ...matchingGroups,
            ...matchingAccounts,
            ...matchingCertificates
        ];

        return NextResponse.json(results);
    } catch (error) {
        console.error('[Search API] Error:', error);
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
} 