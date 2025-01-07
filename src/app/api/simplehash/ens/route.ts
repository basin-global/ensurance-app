// TODO: Implement ENS functionality
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'ENS functionality coming soon' }, { status: 503 });
} 