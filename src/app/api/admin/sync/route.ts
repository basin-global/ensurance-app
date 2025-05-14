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
    const address = headersList.get('x-address') || undefined;
    if (!isAppAdmin(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const body = await request.json();
    const { entity, group_name, token_id, empty_only, market_data, batch_process } = body;

    if (!entity) {
      return NextResponse.json({ error: 'Invalid request - entity required' }, { status: 400 });
    }

    console.log('Sync request:', { entity, group_name, token_id, empty_only, market_data, batch_process });

    // Run sync operation
    const result = await sync(entity as SyncEntity, { 
      group_name, 
      token_id, 
      empty_only,
      market_data,
      batch_process
    });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
} 