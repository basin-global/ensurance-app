// TODO: Implement ENS functionality
import { NextResponse } from 'next/server';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'ENS functionality coming soon' }, { status: 503 });
} 