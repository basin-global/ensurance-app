import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <nav className="bg-background-light dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Link 
              href="/admin"
              className="text-lg font-semibold"
            >
              Admin
            </Link>
            
            <div className="ml-8 space-x-4">
              <Link 
                href="/admin/sync"
                className="text-sm hover:text-blue-500"
              >
                Sync
              </Link>
              <Link 
                href="/admin/exports"
                className="text-sm hover:text-blue-500"
              >
                Exports
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main>
        {children}
      </main>
    </div>
  )
} 