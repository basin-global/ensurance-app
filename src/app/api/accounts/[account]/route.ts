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
        console.log('API Route - Description:', account?.description);
        
        if (!account) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404 }
            );
        }
        
        const response = { ...account };
        console.log('API Route - Final response:', response);
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching account:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account' },
            { status: 500 }
        );
    }
} 