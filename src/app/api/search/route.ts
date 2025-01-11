import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { groups } from '@/lib/database/queries/groups';
import { accounts } from '@/lib/database/queries/accounts';
import { ensurance } from '@/lib/database/queries/ensurance';
import { poolNameMappings } from '@/modules/ensurance/poolMappings';
import { getSiteContext, getBasePath } from '@/config/routes';

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
        const host = request.headers.get('host') || '';
        const siteContext = getSiteContext(host, request.nextUrl.pathname);
        const basePath = getBasePath(siteContext);
        
        console.log('[Search API] Request context:', {
            query,
            host,
            siteContext,
            basePath,
            pathname: request.nextUrl.pathname
        });

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const searchLower = query.toLowerCase();
        console.log('Starting database queries with basePath:', basePath);

        try {
            // Fetch all data in parallel
            const [groupsData, accountsData, certificatesData] = await Promise.all([
                isCacheValid('groups') ? cache.groups.data : groups.getSearchResults(),
                isCacheValid('accounts') ? cache.accounts.data : accounts.getSearchResults(),
                isCacheValid('certificates') ? cache.certificates.data : ensurance.getSearchResults()
            ]);
            
            console.log('Database results:', {
                groupsCount: groupsData?.length || 0,
                accountsCount: accountsData?.length || 0,
                certificatesCount: certificatesData?.length || 0
            });

            // Update cache
            if (!isCacheValid('groups')) {
                cache.groups = { data: groupsData, timestamp: Date.now() };
            }
            if (!isCacheValid('accounts')) {
                cache.accounts = { data: accountsData, timestamp: Date.now() };
            }
            if (!isCacheValid('certificates')) {
                cache.certificates = { data: certificatesData, timestamp: Date.now() };
            }

            // Process results in parallel
            const [matchingGroups, matchingAccounts, matchingCertificates] = await Promise.all([
                groupsData
                    .filter(group => 
                        group.og_name.toLowerCase().includes(searchLower) ||
                        group.name_front?.toLowerCase().includes(searchLower)
                    )
                    .map(group => ({
                        name: group.name_front || group.og_name,
                        path: `${basePath}/groups/${group.og_name.replace(/^\./, '')}/all`,
                        type: 'group'
                    })),
                accountsData
                    .filter(account => 
                        account.full_account_name.toLowerCase().includes(searchLower)
                    )
                    .map(account => ({
                        name: account.full_account_name,
                        path: `${basePath}/${account.full_account_name}`,
                        type: 'account',
                        is_agent: account.is_agent,
                        is_pool: account.full_account_name in poolNameMappings
                    })),
                certificatesData
                    .filter(cert => 
                        cert.name?.toLowerCase().includes(searchLower) ||
                        cert.chain?.toLowerCase().includes(searchLower)
                    )
                    .map(cert => ({
                        name: cert.name || `Certificate #${cert.token_id}`,
                        path: `${basePath}/certificates/${cert.chain}/${cert.token_id}`,
                        type: 'certificate'
                    }))
            ]);

            return NextResponse.json({ 
                results: [...matchingGroups, ...matchingAccounts, ...matchingCertificates] 
            });

        } catch (dbError) {
            console.error('Database query failed:', dbError);
            throw dbError;
        }

    } catch (error) {
        console.error('Search failed:', error);
        // Return error details in development
        if (process.env.NODE_ENV === 'development') {
            return NextResponse.json({ 
                error: error.message,
                stack: error.stack
            }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 