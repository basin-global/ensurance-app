import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { isAppAdmin } from '@/config/admin'
import { getAddress } from 'viem'
import { syncService } from '@/modules/admin/sync/service'
import type { SyncOptions } from '@/modules/admin/sync/types'

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const headersList = headers()
    const address = headersList.get('x-address')
    
    if (!address || !isAppAdmin(getAddress(address))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync options from request body
    const options: SyncOptions = await request.json()

    // Perform sync
    const result = await syncService.sync(options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Sync operation failed', details: error.message },
      { status: 500 }
    )
  }
} 