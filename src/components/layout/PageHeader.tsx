import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Tab {
  value: string
  display: string
  href: string
}

interface PageHeaderProps {
  title: string
  description?: string
  searchQuery?: string
  setSearchQuery?: (query: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (value: string) => void
  variant?: 'default' | 'compact'
  onSearch?: (query: string) => void
  backLink?: string
  showBackArrow?: boolean
}

export function PageHeader({ 
  title, 
  description,
  searchQuery = '', 
  setSearchQuery,
  searchPlaceholder = "Search...",
  showSearch = true,
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  onSearch,
  backLink,
  showBackArrow = false
}: PageHeaderProps) {
  // Handle search input
  const handleSearch = (query: string) => {
    if (setSearchQuery) {
      setSearchQuery(query);
    }
    if (onSearch) {
      onSearch(query);
    }
  };

  const headerContent = (
    <>
      <h1 className={cn(
        "font-bold text-center",
        variant === 'compact' ? "text-xl md:text-2xl" : "text-2xl md:text-4xl mb-3 md:mb-4"
      )}>{title}</h1>
      {description && (
        <p className={cn(
          "text-gray-400 text-center max-w-2xl mx-auto text-sm md:text-base",
          variant === 'compact' ? "md:text-left" : "mb-6 md:mb-8"
        )}>{description}</p>
      )}
    </>
  );

  const wrappedContent = showBackArrow && backLink ? (
    <Link href={backLink} className="block">
      <div className="flex justify-center items-center gap-3 group">
        <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        {headerContent}
      </div>
    </Link>
  ) : headerContent;

  if (variant === 'compact') {
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-2 px-4 pt-8">
        {wrappedContent}
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 pt-8">
      {wrappedContent}
      {tabs && (
        <nav className="mb-6 md:mb-8 overflow-x-auto">
          <div className="container mx-auto flex flex-col items-center min-w-full">
            <div className="border-b border-gray-800 w-full">
              <ul className="flex gap-4 md:gap-8 justify-start md:justify-center px-2 md:px-0 whitespace-nowrap">
                {tabs.map((tab) => (
                  <li key={tab.value}>
                    <button
                      onClick={() => onTabChange?.(tab.value)}
                      className={cn(
                        "inline-block py-3 md:py-4 text-sm md:text-base font-medium transition-colors",
                        activeTab === tab.value
                          ? "text-white border-b-2 border-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      {tab.display}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      )}
      {showSearch && (
        <div className="w-full flex justify-center mb-6 md:mb-8 px-2 md:px-0">
          <AssetSearch 
            searchQuery={searchQuery} 
            setSearchQuery={handleSearch}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
    </div>
  )
} 