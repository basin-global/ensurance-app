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
  onTabChange
}: PageHeaderProps) {
  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-4">{title}</h1>
      {description && (
        <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">{description}</p>
      )}
      {tabs && (
        <nav className="mb-8">
          <div className="container mx-auto flex flex-col items-center">
            <div className="border-b border-gray-800">
              <ul className="flex gap-8">
                {tabs.map((tab) => (
                  <li key={tab.value}>
                    <button
                      onClick={() => onTabChange?.(tab.value)}
                      className={cn(
                        "inline-block py-4 font-medium transition-colors",
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
        <div className="w-full flex justify-center mb-8">
          <AssetSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
    </>
  )
} 