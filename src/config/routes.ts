// Simple config for domain
export const siteConfig = {
    prodDomain: 'ensurance.app',
    appDir: '/app'
}

// Get the API prefix for requests
export function getApiPrefix(): string {
    return '/api'
}

// Simple helper to get the URL prefix for client routes
export function getBasePath(): string {
    return ''
} 