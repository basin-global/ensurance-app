'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type SiteType = 'ensurance' | 'onchain-agents'

const SiteContext = createContext<SiteType>('ensurance')

export function useSite() {
  return useContext(SiteContext)
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<SiteType>('ensurance')

  useEffect(() => {
    const isOnchainAgents = 
      window.location.hostname === 'onchain-agents.ai' || 
      window.location.pathname.startsWith('/site-onchain-agents')
    
    setSite(isOnchainAgents ? 'onchain-agents' : 'ensurance')
  }, [])

  return (
    <SiteContext.Provider value={site}>
      {children}
    </SiteContext.Provider>
  )
} 