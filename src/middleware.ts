import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const domainMappings = {
  'ensurance.app': '(ensurance-app)',
  'onchain-agents.ai': '(onchain-agents)',
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')

  for (const [domain, path] of Object.entries(domainMappings)) {
    if (hostname?.includes(domain)) {
      return NextResponse.rewrite(new URL(`/${path}${request.nextUrl.pathname}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 