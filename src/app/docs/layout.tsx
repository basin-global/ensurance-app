import { headers } from 'next/headers'
import { getSiteContext } from '@/config/routes'
import { docsNav, extractToc } from '@/lib/docs'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const site = getSiteContext(
    headersList.get('host') || '',
    headersList.get('x-pathname') || ''
  )

  // Extract table of contents from children
  const toc = extractToc(children)

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          {/* Left Sidebar - Navigation */}
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-8">
              <nav className="flex flex-col gap-6">
                <h2 className="font-mono text-sm opacity-50">navigation</h2>
                <div className="flex flex-col gap-2">
                  {docsNav.map((item) => (
                    <a 
                      key={item.href}
                      href={item.href} 
                      className="font-mono text-sm opacity-50 hover:opacity-100"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-mono opacity-50">
                  {site === 'onchain-agents' ? 'onchain agents' : 'ensurance'} docs
                </h1>
              </div>
              {children}
            </div>
          </div>

          {/* Right Sidebar - Table of Contents */}
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-8">
              <nav className="flex flex-col gap-6">
                <h2 className="font-mono text-sm opacity-50">on this page</h2>
                <div className="flex flex-col gap-2">
                  {toc.map((section) => (
                    <div key={section.href} className="flex flex-col gap-2">
                      <a href={section.href} className="font-mono text-sm opacity-50 hover:opacity-100">
                        {section.title}
                      </a>
                      {section.subsections?.length > 0 && (
                        <div className="ml-4 flex flex-col gap-2">
                          {section.subsections.map((subsection) => (
                            <a
                              key={subsection.href}
                              href={subsection.href}
                              className="font-mono text-sm opacity-50 hover:opacity-100"
                            >
                              {subsection.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 