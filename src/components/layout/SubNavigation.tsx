'use client'

import Link from 'next/link'

interface SubNavigationProps {
  type: 'accounts' | 'og' | 'assets' | 'ensurance';
}

export function SubNavigation({ type }: SubNavigationProps) {
  const links = [
    { href: `/${type}/all`, label: 'ALL' },
    { href: `/${type}/create`, label: 'CREATE' },
    { href: `/${type}/mine`, label: 'MINE' }
  ]

  return (
    <nav>
      <ul>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}