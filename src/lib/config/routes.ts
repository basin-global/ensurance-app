export type SiteContext = 'ensurance' | 'onchain-agents'

// Simple config for which domain uses which directory
export const siteConfig = {
    ensurance: {
        prodDomain: 'ensurance.app',
        appDir: '/app'
    },
    onchainAgents: {
        prodDomain: 'onchain-agents.ai',
        appDir: '/app/onchain-agents',
        devPath: '/site-onchain-agents'
    }
}

// Simple helper to determine which site we're on
export function getSiteContext(hostname: string, pathname: string): SiteContext {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
        // In dev, only check the initial part of the path, ignoring API calls
        const basePath = pathname.split('/')[1] // Get first path segment
        return basePath === 'site-onchain-agents' ? 'onchain-agents' : 'ensurance'
    }
    return hostname.includes('onchain-agents.ai') ? 'onchain-agents' : 'ensurance'
}

// Get the API prefix for requests
export function getApiPrefix(site: SiteContext): string {
    const isDev = process.env.NODE_ENV === 'development'
    // In dev mode for onchain-agents, prefix with /site-onchain-agents
    // All other cases (prod and ensurance) just use /api
    return site === 'onchain-agents' && isDev ? '/site-onchain-agents/api' : '/api'
}

// Simple helper to get the URL prefix for client routes
export function getBasePath(site: SiteContext): string {
    const isDev = process.env.NODE_ENV === 'development'
    // Only add prefix in development for onchain-agents
    if (site === 'onchain-agents' && isDev) {
        return '/site-onchain-agents'
    }
    return ''
}

// Helper to check if a feature should be shown on a site
export function isSite(currentSite: SiteContext, site: SiteContext): boolean {
    return currentSite === site
}

export function getBaseUrl() {
    if (typeof window === 'undefined') return ''; // Server-side
    
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const host = window.location.host
    return `${protocol}://${host}`
} 