import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAppAdmin } from '@/config/admin';
import { sync } from '@/modules/admin/sync/service';
import type { SyncEntity } from '@/modules/admin/sync/types';

export const dynamic = 'force-dynamic';

// Sync data from onchain to database
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const headersList = headers();
    const address = headersList.get('x-address');
    if (!isAppAdmin(address)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get request data
    const body = await request.json();
    const { entity, group_name, token_id } = body;

    if (!entity) {
      return new NextResponse('Invalid request - entity required', { status: 400 });
    }

    // Run sync operation
    const result = await sync(entity as SyncEntity, { group_name, token_id });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Sync error:', error);
    return new NextResponse(error.message || 'Sync failed', { status: 500 });
  }
} 