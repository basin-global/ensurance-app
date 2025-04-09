import { AssetSearch } from '@/modules/assets/AssetSearch'
import { cn } from '@/lib/utils'

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
}

export function PageHeader({ 
  title, 
  description,
  searchQuery = '', 
  setSearchQuery = () => {}, 
  searchPlaceholder = "Search accounts...",
  showSearch = true,
  tabs,
  activeTab,
  onTabChange,
  variant = 'default'
}: PageHeaderProps) {
  if (variant === 'compact') {
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-2 px-4">
        <h1 className="text-xl md:text-2xl font-bold text-center md:text-right">{title}</h1>
        {description && (
          <p className="text-gray-400 text-center md:text-left max-w-xl">{description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6">
      <h1 className="text-2xl md:text-4xl font-bold text-center mb-3 md:mb-4">{title}</h1>
      {description && (
        <p className="text-gray-400 text-center mb-6 md:mb-8 max-w-2xl mx-auto text-sm md:text-base">{description}</p>
      )}
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
            setSearchQuery={setSearchQuery}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
    </div>
  )
} 