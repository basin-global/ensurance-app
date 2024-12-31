'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSite } from '@/contexts/site-context'
import AccountsGrid from '@/modules/accounts/AccountsGrid'

export default function GroupPage({ params }: { params: { group: string; view: string } }) {
  const router = useRouter()
  const site = useSite()

  useEffect(() => {
    console.log('Group page params:', params, 'site:', site)
    
    if (params.group === 'ensurance' && params.view === 'all') {
      const basePath = site === 'onchain-agents' ? '/site-onchain-agents' : ''
      const redirectPath = `${basePath}/pools`
      console.log('Redirecting to:', redirectPath)
      router.replace(redirectPath)
      return
    }
  }, [params.group, params.view, router, site])

  return (
    <div className="container mx-auto px-4 py-8">
      <AccountsGrid groupName={params.group} />
    </div>
  )
} 