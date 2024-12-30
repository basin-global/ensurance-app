import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/queries/accounts';

export async function GET(
    request: Request,
    { params }: { params: { group: string } }
) {
    try {
        console.log('Fetching accounts for group:', params.group);
        const groupAccounts = await accounts.getByGroup(`.${params.group}`);
        console.log('Found accounts:', groupAccounts.length);
        return NextResponse.json(groupAccounts);
    } catch (error) {
        console.error('Error fetching group accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
} 