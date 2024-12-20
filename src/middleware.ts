import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const isDev = process.env.NODE_ENV === 'development'

  // Skip for static files and API routes
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For development testing
  if (isDev && request.nextUrl.pathname.startsWith('/site-onchain-agents')) {
    const newPath = request.nextUrl.pathname.replace('/site-onchain-agents', '')
    const newUrl = new URL(`/onchain-agents${newPath}`, request.url)
    return NextResponse.rewrite(newUrl)
  }

  // Production domain mapping
  if (hostname?.includes('onchain-agents.ai')) {
    const newUrl = new URL(`/onchain-agents${request.nextUrl.pathname}`, request.url)
    return NextResponse.rewrite(newUrl)
  }

  // All other requests go to main app
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 