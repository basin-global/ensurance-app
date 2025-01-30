import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const { account_name, stats } = await request.json();
        
        if (!account_name || !stats) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const groupName = account_name.split('.')[1];
        const tableName = `situs_accounts_${groupName}`;

        // Update the stats in the database
        const query = `
            UPDATE "${tableName}"
            SET 
                total_currency_value = $1,
                total_assets = $2,
                ensured_assets = $3,
                stats_last_updated = $4
            WHERE full_account_name = $5
            RETURNING *
        `;

        const result = await sql.query(query, [
            stats.total_currency_value,
            stats.total_assets,
            stats.ensured_assets,
            stats.stats_last_updated,
            account_name
        ]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            message: 'Stats updated successfully',
            account: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating account stats:', error);
        return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }
} 