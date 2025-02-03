'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navigation items for the sidebar
const navItems = [
  {
    title: 'TLDR',
    links: [
      { href: '/docs/tldr', label: 'TLDR' },
    ]
  },
  {
    title: 'FUNDAMENTALS',
    links: [
      { href: '/docs/fundamentals', label: 'FUNDAMENTALS' },
    ]
  },
  {
    title: 'NATURAL CAPITAL',
    links: [
      { href: '/docs/natural-capital', label: 'NATURAL CAPITAL' },
    ]
  },
  {
    title: 'ENSURANCE',
    links: [
      { href: '/docs/ensurance', label: 'ENSURANCE' },
    ]
  },
  {
    title: 'PROTOCOL',
    links: [
      { href: '/docs/protocol', label: 'PROTOCOL' },
    ]
  },
  {
    title: 'TECHNICAL',
    links: [
      { href: '/docs/technical', label: 'TECHNICAL' },
    ]
  },
  {
    title: 'FAQ',
    links: [
      { href: '/docs/faq', label: 'FAQ' },
    ]
  }
]

function DocsNavigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 pr-8 hidden md:block">
      <div className="sticky top-24">
        <h5 className="text-xs font-semibold text-[rgba(var(--foreground-rgb),0.5)] uppercase tracking-wide mb-6 font-mono">
          Documentation
        </h5>
        <ul className="space-y-4">
          {navItems.map((section, idx) => (
            <li key={idx}>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block py-1 text-sm font-grotesk ${
                    pathname === link.href
                      ? 'text-[rgb(var(--foreground-rgb))]'
                      : 'text-[rgba(var(--foreground-rgb),0.7)] hover:text-[rgb(var(--foreground-rgb))]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function TableOfContents() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [opacity, setOpacity] = useState(1)
  const pathname = usePathname()

  useEffect(() => {
    // Get all headings from the main content
    const elements = document.querySelectorAll('main h2, main h3')
    const headingsList = Array.from(elements).map((element) => {
      // Generate ID if not present (fallback)
      if (!element.id) {
        element.id = element.textContent?.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || ''
      }
      return {
        id: element.id,
        text: element.textContent || '',
        level: Number(element.tagName[1])
      }
    })
    setHeadings(headingsList)

    // Handle scroll and active section
    const handleScroll = () => {
      const pageNav = document.querySelector('.page-navigation')
      if (!pageNav) return

      // Handle opacity
      const windowHeight = window.innerHeight
      const pageNavTop = pageNav.getBoundingClientRect().top
      const fadeDistance = windowHeight / 2
      const rawOpacity = Math.min(Math.max((pageNavTop - (windowHeight / 2)) / fadeDistance, 0), 1)
      const newOpacity = 0.4 + (rawOpacity * 0.6)
      setOpacity(newOpacity)

      // Find active section
      const headingElements = Array.from(document.querySelectorAll('main h2, main h3'))
      for (const element of headingElements) {
        const { top } = element.getBoundingClientRect()
        if (top >= 0 && top <= 150) {
          setActiveId(element.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return (
    <nav className="w-64 pl-8 hidden lg:block">
      <div className="sticky top-24" style={{ opacity: headings.length ? opacity : 0, transition: 'opacity 150ms ease-out' }}>
        {headings.length > 0 && (
          <>
            <h5 className="text-xs font-semibold text-[rgba(var(--foreground-rgb),0.5)] uppercase tracking-wide mb-6 font-mono">
              On this page
            </h5>
            <ul className="space-y-1.5">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <Link
                    href={`${pathname}#${heading.id}`}
                    className={`block py-1 text-sm hover:text-[rgba(var(--foreground-rgb),0.8)] font-grotesk transition-colors ${
                      heading.level === 3 ? 'pl-3 text-xs' : ''
                    } ${
                      activeId === heading.id 
                        ? 'text-[rgb(var(--foreground-rgb))]' 
                        : 'text-[rgba(var(--foreground-rgb),0.5)]'
                    }`}
                  >
                    {heading.text}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </nav>
  )
}

function PageNavigation() {
  const pathname = usePathname()
  
  const allPages = navItems.reduce((acc, section) => {
    return [...acc, ...section.links]
  }, [] as { href: string; label: string }[])
  
  const currentIndex = allPages.findIndex(page => page.href === pathname)
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null
  
  return (
    <div className="mt-16 flex justify-center gap-8 border-t border-[rgba(var(--foreground-rgb),0.1)] pt-8 page-navigation">
      {prevPage ? (
        <Link 
          href={prevPage.href} 
          className="group flex flex-col items-center p-4 rounded-lg bg-[rgba(var(--foreground-rgb),0.03)] hover:bg-[rgba(var(--foreground-rgb),0.05)] transition-all duration-200 min-w-[200px]"
        >
          <span className="text-sm text-[rgba(var(--foreground-rgb),0.5)]">Previous</span>
          <span className="text-center text-[rgba(var(--foreground-rgb),0.8)] group-hover:text-[rgb(var(--foreground-rgb))]">
            {prevPage.label}
          </span>
        </Link>
      ) : <div className="min-w-[200px]" />}
      
      {nextPage ? (
        <Link 
          href={nextPage.href} 
          className="group flex flex-col items-center p-4 rounded-lg bg-[rgba(var(--foreground-rgb),0.03)] hover:bg-[rgba(var(--foreground-rgb),0.05)] transition-all duration-200 min-w-[200px]"
        >
          <span className="text-sm text-[rgba(var(--foreground-rgb),0.5)]">Next</span>
          <span className="text-center text-[rgba(var(--foreground-rgb),0.8)] group-hover:text-[rgb(var(--foreground-rgb))]">
            {nextPage.label}
          </span>
        </Link>
      ) : <div className="min-w-[200px]" />}
    </div>
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
        <main className="flex-1 min-w-0 max-w-3xl mx-auto -mt-8">
          <div className="prose prose-invert max-w-none">
            {children}
          </div>
          <PageNavigation />
        </main>
        <TableOfContents />
      </div>
    </div>
  )
}