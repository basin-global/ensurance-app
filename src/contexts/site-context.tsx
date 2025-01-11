'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { SiteContext as SiteContextType, getSiteContext } from '@/config/routes'

const SiteContext = createContext<SiteContextType>('ensurance')

export function useSite() {
  return useContext(SiteContext)
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<SiteContextType>('ensurance')

  useEffect(() => {
    // Use the same logic as our routing config
    const hostname = window.location.hostname
    const pathname = window.location.pathname
    setSite(getSiteContext(hostname, pathname))
  }, [])

  return (
    <SiteContext.Provider value={site}>
      {children}
    </SiteContext.Provider>
  )
} 