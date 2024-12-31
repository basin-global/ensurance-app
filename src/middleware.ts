import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const pathname = request.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'

  // Add pathname to headers for metadata generation
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Skip for static files and API routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api')) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // For development testing
  if (isDev && pathname.startsWith('/site-onchain-agents')) {
    // Handle root path for onchain-agents site
    const newPath = pathname === '/site-onchain-agents' ? '/onchain-agents' : pathname.replace('/site-onchain-agents', '')
    return NextResponse.rewrite(new URL(newPath, request.url), {
      request: { headers: requestHeaders }
    })
  }

  // Production domain mapping for onchain-agents.ai
  if (hostname?.includes('onchain-agents.ai')) {
    // Handle root path specifically
    const newPathname = pathname === '/' ? '/onchain-agents' : pathname
    return NextResponse.rewrite(new URL(newPathname, request.url), {
      request: { headers: requestHeaders }
    })
  }

  // All other requests go to main app
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 