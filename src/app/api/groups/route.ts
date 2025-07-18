import { NextRequest, NextResponse } from 'next/server';
import { groups } from '@/lib/database/groups';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

// Cache successful responses for 1 hour
export const revalidate = 3600;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const groupName = searchParams.get('group_name');
        const includeInactive = searchParams.get('include_inactive') === 'true';

        if (groupName) {
            const group = await groups.getByName(groupName);
            return NextResponse.json(group, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            });
        }

        const allGroups = await groups.getAll(includeInactive);
        return NextResponse.json(allGroups, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json(
            { error: 'Failed to fetch groups' },
            { status: 500 }
        );
    }
}

// POST method doesn't need caching since it's modifying data
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const result = await groups.create(data);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 