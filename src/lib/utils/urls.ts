import { useSite } from '@/contexts/site-context'

export function useUrlBuilder() {
  const site = useSite()
  
  return {
    groupUrl: (groupName: string) => {
      const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
      return `${basePath}/groups/${groupName.replace(/^\./, '')}`
    },
    
    accountUrl: (accountName: string) => {
      const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
      return `${basePath}/${accountName}`
    }
  }
} 