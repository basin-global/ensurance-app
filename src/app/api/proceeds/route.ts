import { NextResponse } from 'next/server';
import { proceeds } from '@/lib/database/proceeds';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

// Cache successful responses for 1 minute
export const revalidate = 60;

// Cache for names and address data
const CACHE_DURATION = 60 * 1000; // 1 minute
const cache = {
  names: {
    data: null as any,
    timestamp: 0
  },
  byAddress: new Map<string, { data: any, timestamp: number }>()
};

async function getWithCache(type: 'names' | 'address', address?: string) {
  const now = Date.now();

  // Handle names request
  if (type === 'names') {
    if (cache.names.data && (now - cache.names.timestamp) < CACHE_DURATION) {
      return cache.names.data;
    }
    
    const data = await proceeds.getNames();
    // Convert to map format for frontend compatibility
    const addressMap = data.reduce((acc, row) => {
      acc[row.address.toLowerCase()] = {
        name: row.name,
        type: row.type,
        description: row.description
      };
      return acc;
    }, {});

    cache.names = {
      data: addressMap,
      timestamp: now
    };
    return addressMap;
  }

  // Handle address request
  if (address) {
    const addressCache = cache.byAddress.get(address);
    if (addressCache && (now - addressCache.timestamp) < CACHE_DURATION) {
      return addressCache.data;
    }
    
    const data = await proceeds.getByAddress(address);
    cache.byAddress.set(address, {
      data,
      timestamp: now
    });
    return data;
  }

  throw new Error('Invalid request parameters');
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    // If address provided, get specific address data
    if (address) {
      const data = await getWithCache('address', address);
      return NextResponse.json(data);
    }
    
    // Otherwise return all named addresses
    const rawData = await proceeds.getNames();
    console.log('Raw data from database:', rawData);
    
    // Convert to map format for frontend compatibility
    const addressMap = rawData.reduce((acc, row) => {
      console.log('Processing row:', row);
      acc[row.address.toLowerCase()] = {
        name: row.name,
        type: row.type,
        description: row.description
      };
      return acc;
    }, {});

    console.log('Final address map:', addressMap);
    return NextResponse.json(addressMap);

  } catch (error) {
    console.error('Error in proceeds route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proceeds data' },
      { status: 500 }
    );
  }
} 