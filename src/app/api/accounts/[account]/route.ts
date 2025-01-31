import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/queries/accounts';

export async function GET(
    request: Request,
    { params }: { params: { account: string } }
) {
    try {
        console.log('API Route - Fetching account:', params.account);
        const account = await accounts.getByFullName(params.account);
        console.log('API Route - Raw account data:', account);
        
        if (!account) {
            return NextResponse.json(
                { error: 'Account not found', full_account_name: params.account },
                { status: 404 }
            );
        }
        
        return NextResponse.json(account);
    } catch (error) {
        console.error('Error fetching account:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account', details: error.message },
            { status: 500 }
        );
    }
} 