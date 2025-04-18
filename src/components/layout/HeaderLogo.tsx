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

  // Get header text and tagline based on path
  let headerText = 'ensurance'
  let tagline = 'markets for what matters'

  if (isNaturalCapital) {
    headerText = 'natural capital ensurance'
    tagline = ''
  } else if (pathname.includes('/proceeds')) {
    headerText = 'ensurance proceeds'
    tagline = 'perpetual funding for natural capital & the people who steward it'
  } else if (groupName) {
    headerText = `${groupName} ensurance agents`
    tagline = ''
  }

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
          width={32}
          height={32}
        />
      </Link>
      <div>
        {groupName || isNaturalCapital ? (
          <Link href={groupUrl} className={cn(
            "hover:opacity-80 transition-opacity",
            isNaturalCapital && "bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600"
          )}>
            {headerText}
          </Link>
        ) : (
          <>
            <Link href={homeUrl} className="hover:opacity-80 transition-opacity">
              {headerText}
              {tagline && (
                <div className="text-xs opacity-70">{tagline}</div>
              )}
            </Link>
          </>
        )}
      </div>
    </div>
  )
} 