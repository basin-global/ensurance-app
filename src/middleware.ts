import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { siteConfig, getSiteContext } from '@/config/routes'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'

  // Add pathname to headers for metadata generation
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-site-context', getSiteContext(hostname, pathname))

  // Handle favicons for both domains
  if (pathname === '/favicon.ico') {
    const referer = request.headers.get('referer') || ''
    const isOnchainAgents = hostname.includes('onchain-agents.ai') || 
      (isDev && referer.includes('/site-onchain-agents'))

    const faviconPath = isOnchainAgents 
      ? '/onchain-agents/favicon.ico'
      : '/ensurance/favicon.ico'

    return NextResponse.rewrite(new URL(faviconPath, request.url), {
      request: { headers: requestHeaders }
    })
  }

  // Skip for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // Development mode handling
  if (isDev && pathname.startsWith('/site-onchain-agents')) {
    const newPath = pathname === '/site-onchain-agents'
      ? '/onchain-agents'
      : pathname.replace('/site-onchain-agents', '')
    return NextResponse.rewrite(new URL(newPath, request.url), {
      request: { headers: requestHeaders }
    })
  }

  // Production domain mapping for onchain-agents.ai
  if (hostname?.includes(siteConfig.onchainAgents.prodDomain)) {
    // Don't rewrite API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.next({
        request: { headers: requestHeaders }
      })
    }
    
    const newPathname = pathname === '/' ? '/onchain-agents' : pathname
    return NextResponse.rewrite(new URL(newPathname, request.url), {
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