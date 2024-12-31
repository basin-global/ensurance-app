'use client'

import { useSite } from '@/contexts/site-context'

export function SiteWrapper({ children }: { children: React.ReactNode }) {
  const site = useSite()
  
  return (
    <div className={site === 'onchain-agents' ? 'onchain-agents' : 'ensurance'}>
      {children}
    </div>
  )
} 