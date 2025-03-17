import { NextRequest, NextResponse } from 'next/server';
import { groups } from '@/lib/database/queries/groups';

// Cache successful responses for 1 hour
export const revalidate = 3600;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const groupName = searchParams.get('group_name');

        if (groupName) {
            const group = await groups.getByName(groupName);
            return NextResponse.json(group, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            });
        }

        const allGroups = await groups.getAll();
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 