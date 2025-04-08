import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  
  // Add pathname to headers for metadata generation
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Detect Farcaster clients (Warpcast)
  const isFarcasterClient = userAgent.toLowerCase().includes('warpcast')

  // If it's a Farcaster client viewing a certificate, redirect to mini-app version
  if (isFarcasterClient && pathname.startsWith('/general/')) {
    const miniAppPath = `/mini-app${pathname}`
    return NextResponse.redirect(new URL(miniAppPath, request.url))
  }

  // Handle favicon
  if (pathname === '/favicon.ico') {
    return NextResponse.rewrite(new URL('/ensurance/favicon.ico', request.url), {
      request: { headers: requestHeaders }
    })
  }

  // Update: Redirect /groups/ensurance/all to /natural-capital instead of /pools
  if (pathname === '/groups/ensurance/all') {
    return NextResponse.redirect(new URL('/natural-capital', request.url))
  }

  // Skip for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
} 