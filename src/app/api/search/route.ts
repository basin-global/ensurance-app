import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.toLowerCase();
        
        // Determine if we're in onchain-agents context from the host
        const host = request.headers.get('host') || '';
        const referer = request.headers.get('referer') || '';
        console.log('Debug context:', { 
            host, 
            referer,
            isDev: process.env.NODE_ENV === 'development',
            hasOnchainInUrl: referer.includes('site-onchain-agents')
        });
        
        const isOnchainAgents = host.includes('onchain-agents') || 
            (process.env.NODE_ENV === 'development' && referer.includes('site-onchain-agents'));
            
        console.log('Is onchain agents context:', isOnchainAgents);

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        // First get all groups to build our dynamic query
        const groups = await sql`SELECT og_name FROM situs_ogs ORDER BY og_name`;
        
        // Build the dynamic UNION ALL query for accounts
        const accountQueries = groups.rows.map(g => {
            const agentFilter = isOnchainAgents ? 'AND is_agent = true' : '';
            console.log('Agent filter for', g.og_name, ':', agentFilter);
            
            return `
                SELECT full_account_name as name, '${g.og_name}' as og_name, 'account' as type
                FROM "situs_accounts_${g.og_name.replace('.', '')}"
                WHERE LOWER(full_account_name) LIKE '%${query}%'
                ${agentFilter}
            `;
        }).join('\nUNION ALL\n');

        // Combine with groups query
        const fullQuery = `
            WITH all_results AS (
                ${accountQueries}
                UNION ALL
                SELECT og_name as name, og_name, 'group' as type
                FROM situs_ogs
                WHERE LOWER(og_name) LIKE '%${query}%'
            )
            SELECT * FROM all_results
            ORDER BY 
                CASE WHEN type = 'group' THEN 0 ELSE 1 END,
                name
        `;

        const searchResults = await sql.query(fullQuery);

        const results = searchResults.rows.map(row => ({
            name: row.name,
            path: row.type === 'group' 
                ? `/groups/${row.name.replace('.', '')}`
                : `/${row.name}`
        }));

        return NextResponse.json({ results });

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json(
            { error: 'Failed to perform search' },
            { status: 500 }
        );
    }
} 