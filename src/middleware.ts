import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const pathname = request.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'

  // Skip for static files and API routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For development testing
  if (isDev && pathname.startsWith('/site-onchain-agents')) {
    const newPath = pathname.replace('/site-onchain-agents', '')
    return NextResponse.rewrite(new URL(newPath, request.url))
  }

  // Production domain mapping for onchain-agents.ai
  if (hostname?.includes('onchain-agents.ai')) {
    return NextResponse.rewrite(new URL(pathname, request.url))
  }

  // All other requests go to main app
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 