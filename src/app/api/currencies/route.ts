import { NextRequest, NextResponse } from 'next/server';
import { currencies } from '@/lib/database/config/currencies';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const allCurrencies = await currencies.getAll();
    return NextResponse.json(allCurrencies);
  } catch (error) {
    console.error('[Currencies API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch currencies', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const currency = await currencies.getByAddress(address);
    if (!currency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
    }

    // Here you can add market data fetching if needed
    // Similar to how it's done in general/route.ts

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Currencies API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh currency data', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 