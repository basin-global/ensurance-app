'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'

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

  // Special case for .ensurance group and pools page
  const isEnsurancePools = groupName === '.ensurance' || 
    pathname.includes('/pools') || 
    pathname.includes('/groups/ensurance/all')

  const isCertificates = pathname.includes('/certificates/')

  // Determine logo source
  const logoSrc = isEnsurancePools
    ? "/groups/orbs/ensurance-orb.png"
    : groupName 
      ? `/groups/orbs/${groupName.replace(/^\./, '')}-orb.png`
      : "/groups/orbs/ensurance-orb.png"

  // Determine header text
  const headerText = isCertificates
    ? 'certificates of ensurance'
    : isEnsurancePools
      ? 'ensurance pools'
      : groupName 
        ? `${groupName} ensurance agents`
        : 'ensurance agents'

  // Determine URLs
  const homeUrl = '/'
  const poolsUrl = '/pools'
  const certificatesUrl = '/certificates/all'
  const groupUrl = isEnsurancePools
    ? poolsUrl
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
      {isCertificates ? (
        <Link href={certificatesUrl} className="hover:opacity-80 transition-opacity">
          {headerText}
        </Link>
      ) : (groupName || isEnsurancePools) ? (
        <Link href={groupUrl} className="hover:opacity-80 transition-opacity">
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