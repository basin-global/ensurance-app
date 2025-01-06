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
        return pathname.startsWith('/site-onchain-agents') ? 'onchain-agents' : 'ensurance'
    }
    return hostname.includes('onchain-agents.ai') ? 'onchain-agents' : 'ensurance'
}

// Simple helper to get the URL prefix
export function getBasePath(site: SiteContext): string {
    const isDev = process.env.NODE_ENV === 'development'
    if (site === 'onchain-agents') {
        return isDev ? '/site-onchain-agents' : '/onchain-agents'
    }
    return ''
}

// Helper to check if a feature should be shown on a site
export function isSite(currentSite: SiteContext, site: SiteContext): boolean {
    return currentSite === site
} 