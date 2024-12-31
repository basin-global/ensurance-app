import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/queries/accounts';

// Cache successful responses for 1 hour
export const revalidate = 3600;

export async function GET() {
    try {
        const allAccounts = await accounts.getAll();
        
        return NextResponse.json(allAccounts, {
            headers: {
                'Cache-Control': 'no-store'
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