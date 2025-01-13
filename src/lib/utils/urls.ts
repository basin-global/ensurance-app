import { useSite } from '@/contexts/site-context'
import { getBasePath } from '@/config/routes'

export function useUrlBuilder() {
  const site = useSite()
  
  return {
    groupUrl: (groupName: string) => {
      return `${getBasePath(site)}/groups/${groupName.replace(/^\./, '')}`
    },
    
    accountUrl: (accountName: string) => {
      return `${getBasePath(site)}/${accountName}`
    },

    certificateUrl: (chain: string, tokenId: string | number) => {
      return `${getBasePath(site)}/certificates/${chain}/${tokenId}`
    }
  }
} 