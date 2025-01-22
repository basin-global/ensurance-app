'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AccountsGrid from '@/modules/accounts/AccountsGrid'

export default function GroupPage({ params }: { params: { group: string; view: string } }) {
  const router = useRouter()

  useEffect(() => {
    console.log('Group page params:', params)
    
    if (params.group === 'ensurance' && params.view === 'all') {
      console.log('Redirecting to pools')
      router.replace('/pools')
      return
    }
  }, [params.group, params.view, router])

  return (
    <div className="container mx-auto px-4 py-8">
      <AccountsGrid groupName={params.group} />
    </div>
  )
} 