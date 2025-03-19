'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Params {
  group?: string
  account?: string
}

export function HeaderLogo() {
  const pathname = usePathname()
  const params = useParams() as Params
  
  // Get group name from either group page or account page
  let groupName = null
  
  if (pathname.includes('/groups/')) {
    groupName = `.${params.group}`
  } else if (params.account?.includes('.')) {
    groupName = `.${params.account.split('.')[1]}`
  }

  // Special case for natural capital routes and .ensurance accounts
  const isNaturalCapital = pathname.includes('/natural-capital') || 
    (groupName && groupName.endsWith('.ensurance'))

  // Determine logo source
  const logoSrc = isNaturalCapital
    ? "/groups/orbs/ensurance-orb.png"
    : groupName 
      ? `/groups/orbs/${groupName.replace(/^\./, '')}-orb.png`
      : "/groups/orbs/ensurance-orb.png"

  // Determine header text
  const headerText = isNaturalCapital
    ? 'natural capital ensurance'
    : groupName 
      ? `${groupName} ensurance agents`
      : 'natural capital ensurance'

  // Determine URLs
  const homeUrl = '/'
  const groupUrl = isNaturalCapital
    ? '/natural-capital'
    : groupName && `/groups/${groupName.replace(/^\./, '')}`

  return (
    <div className="flex items-center gap-2.5 font-mono font-bold text-base tracking-wide">
      <Link href={homeUrl} className="hover:opacity-80 transition-opacity">
        <Image 
          src={logoSrc}
          alt="Logo"
          width={28}
          height={28}
        />
      </Link>
      {groupName || isNaturalCapital ? (
        <Link href={groupUrl} className={cn(
          "hover:opacity-80 transition-opacity",
          isNaturalCapital && "bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600"
        )}>
          {headerText}
        </Link>
      ) : (
        <Link href={homeUrl} className="hover:opacity-80 transition-opacity">
          {headerText}
        </Link>
      )}
    </div>
  )
} 