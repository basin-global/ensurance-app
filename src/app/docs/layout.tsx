'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navigation items for the sidebar
const navItems = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/installation', label: 'Installation' },
      { href: '/docs/configuration', label: 'Configuration' },
    ]
  },
  {
    title: 'Core Concepts',
    links: [
      { href: '/docs/agents', label: 'Agents' },
      { href: '/docs/groups', label: 'Groups' },
      { href: '/docs/certificates', label: 'Certificates' },
    ]
  },
]

function DocsNavigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 pr-8 hidden md:block">
      <div className="sticky top-24">
        {navItems.map((section, idx) => (
          <div key={idx} className="mb-8">
            <h5 className="mb-3 text-sm font-semibold text-[rgba(var(--foreground-rgb),0.7)] uppercase tracking-wide font-mono">
              {section.title}
            </h5>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block py-1 font-grotesk ${
                      pathname === link.href
                        ? 'text-[rgb(var(--foreground-rgb))]'
                        : 'text-[rgba(var(--foreground-rgb),0.7)] hover:text-[rgb(var(--foreground-rgb))]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function TableOfContents() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])

  useEffect(() => {
    // Get all headings from the main content
    const elements = document.querySelectorAll('main h2, main h3')
    const headingsList = Array.from(elements).map((element) => ({
      id: element.id,
      text: element.textContent || '',
      level: Number(element.tagName[1])
    }))
    setHeadings(headingsList)
  }, [])

  return (
    <nav className="w-64 pl-8 hidden lg:block">
      <div className="sticky top-24">
        <h5 className="text-xs font-semibold text-[rgba(var(--foreground-rgb),0.5)] uppercase tracking-wide mb-3 font-mono">
          On this page
        </h5>
        <ul className="space-y-1.5">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`block py-0.5 text-sm text-[rgba(var(--foreground-rgb),0.5)] hover:text-[rgba(var(--foreground-rgb),0.8)] font-grotesk transition-colors ${
                  heading.level === 3 ? 'pl-3 text-xs' : ''
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex">
        <DocsNavigation />
        <main className="flex-1 min-w-0 max-w-3xl mx-auto">
          <div className="prose prose-invert max-w-none">
            {children}
          </div>
        </main>
        <TableOfContents />
      </div>
    </div>
  )
}