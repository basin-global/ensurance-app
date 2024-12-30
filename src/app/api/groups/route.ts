import { NextRequest, NextResponse } from 'next/server';
import { groups } from '@/lib/database/queries/groups';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ogName = searchParams.get('og_name');

        if (ogName) {
            const group = await groups.getByName(ogName);
            return NextResponse.json(group);
        }

        const allGroups = await groups.getAll();
        return NextResponse.json(allGroups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json(
            { error: 'Failed to fetch groups' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const result = await groups.create(data);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 