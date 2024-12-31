import { NextResponse } from 'next/server';
import { accounts } from '@/lib/database/queries/accounts';

export async function GET(
    request: Request,
    { params }: { params: { account: string } }
) {
    try {
        const account = await accounts.getByFullName(params.account);
        if (!account) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(account);
    } catch (error) {
        console.error('Error fetching account:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account' },
            { status: 500 }
        );
    }
} 