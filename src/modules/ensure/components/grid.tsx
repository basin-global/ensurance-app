'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../hooks/useData'
import { EntityType, ViewMode, EnsureGridConfig, EnsureItem } from '../types'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from '@/lib/utils'
import View from './view'
import Search from './search'
import List from './list'
import Base from '../cards/base'

interface GridProps {
  type: EntityType;
  walletAddress?: string;
  groupName?: string;
  chainId?: string;
  urlPrefix?: string;
  isOwner?: boolean;
  config?: Partial<EnsureGridConfig>;
  className?: string;
  renderItem?: (item: EnsureItem, viewMode: ViewMode) => React.ReactNode;
  items?: EnsureItem[]; // Add items prop for direct data passing
}

export default function Grid({
  type,
  walletAddress,
  groupName,
  chainId,
  urlPrefix = '',
  isOwner = false,
  config = {},
  className,
  renderItem,
  items: providedItems // Rename to avoid conflict with the items from useData
}: GridProps) {
  const router = useRouter();
  
  // Merge default config with provided config
  const gridConfig: EnsureGridConfig = {
    viewModes: ['grid', 'list'],
    defaultViewMode: 'grid',
    showSearch: true,
    showViewToggle: true,
    showAccounts: false,
    loadingItems: 8,
    columns: {
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4
    },
    emptyStateMessage: `No ${type} items found`,
    ...config
  };

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(gridConfig.defaultViewMode || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showAccounts, setShowAccounts] = useState(gridConfig.showAccounts || false);
  const [filteredItems, setFilteredItems] = useState<EnsureItem[]>([]);

  // Fetch data if items are not provided
  const { 
    items: fetchedItems, 
    loading: isLoading, 
    error, 
    hasMore, 
    loadMore: getNextPage,
    refresh
  } = useData({
    type,
    searchQuery: providedItems ? '' : searchQuery, // Only use search query if fetching data
    walletAddress,
    groupName,
    chainId,
    page
  });

  // Use provided items or fetched items
  const allItems = providedItems || fetchedItems;
  const loading = providedItems ? false : isLoading;
  
  // Filter and search items
  useEffect(() => {
    // Filter by search query and account toggle
    const filtered = allItems.filter(item => {
      // Filter by search query
      const matchesSearch = !searchQuery || 
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter accounts based on toggle
      const showBasedOnType = showAccounts || item.type !== 'account';
      
      return matchesSearch && showBasedOnType;
    });
    
    setFilteredItems(filtered);
  }, [allItems, searchQuery, showAccounts]);
  
  // Count of accounts for the toggle label
  const accountsCount = allItems.filter(item => item.type === 'account').length;

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore && !providedItems) {
      setPage(getNextPage());
    }
  };

  // Handle item click
  const handleItemClick = (item: EnsureItem) => {
    if (gridConfig.onItemClick) {
      gridConfig.onItemClick(item);
    } else if (item.url) {
      router.push(`${urlPrefix}${item.url}`);
    }
  };

  // Handle scroll-based loading
  useEffect(() => {
    if (providedItems) return; // Don't use scroll loading with provided items
    
    const handleScroll = () => {
      if (loading || !hasMore) return;
      
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= 
        document.documentElement.scrollHeight - 1000;

      if (scrolledToBottom) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, providedItems]);

  // Reset page when search changes
  useEffect(() => {
    if (!providedItems) {
      setPage(1);
    }
  }, [searchQuery, providedItems]);

  // Generate grid columns class based on config
  const getGridColumnsClass = () => {
    const { columns } = gridConfig;
    return cn(
      "grid gap-4 md:gap-6",
      columns?.sm && `grid-cols-${columns.sm}`,
      columns?.md && `md:grid-cols-${columns.md}`,
      columns?.lg && `lg:grid-cols-${columns.lg}`,
      columns?.xl && `xl:grid-cols-${columns.xl}`
    );
  };

  // Custom render function that adds URL prefix and click handling
  const customRenderItem = (item: EnsureItem) => {
    if (renderItem) {
      return renderItem(item, viewMode);
    }
    
    // If no custom renderer, use the base card
    return (
      <Base 
        item={{
          ...item,
          url: item.url ? `${urlPrefix}${item.url}` : undefined
        }}
        viewMode={viewMode}
        onClick={() => handleItemClick(item)}
      />
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {gridConfig.showSearch && (
          <Search 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder={`Search ${type}...`}
            className="w-full sm:w-64"
          />
        )}
        
        <div className="flex items-center gap-4 ml-auto">
          {/* Account toggle - only show if there are accounts */}
          {accountsCount > 0 && (
            <button
              onClick={() => setShowAccounts(!showAccounts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-xs font-medium ${
                showAccounts 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-primary-dark text-gray-400 hover:text-gray-200"
              }`}
            >
              {showAccounts ? 'Hide' : 'Show'} Accounts ({accountsCount})
            </button>
          )}
          
          {/* View toggle */}
          {gridConfig.showViewToggle && gridConfig.viewModes && gridConfig.viewModes.length > 1 && (
            <View 
              mode={viewMode} 
              onChange={setViewMode}
            />
          )}
        </div>
      </div>
      
      {/* Stats bar - show when items are loaded */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-primary-dark rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-400">Total:</span> <span className="font-medium">{filteredItems.length}</span>
          </div>
          
          {/* Show stats for each entity type that has items */}
          {['group', 'account', 'specificCert', 'generalCert', 'syndicate', 'pool', 'property'].map((entityType) => {
            const count = filteredItems.filter(item => item.type === entityType).length;
            if (count === 0) return null;
            
            return (
              <div key={entityType} className="bg-primary-dark rounded-lg px-3 py-1.5 text-sm">
                <span className="text-gray-400">
                  {entityType === 'group' && 'Groups:'}
                  {entityType === 'account' && 'Accounts:'}
                  {entityType === 'specificCert' && 'Certificates:'}
                  {entityType === 'generalCert' && 'General Certs:'}
                  {entityType === 'syndicate' && 'Syndicates:'}
                  {entityType === 'pool' && 'Pools:'}
                  {entityType === 'property' && 'Properties:'}
                </span>{' '}
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Loading state */}
      {loading && page === 1 && (
        <div className={viewMode === 'grid' ? getGridColumnsClass() : "space-y-4"}>
          {[...Array(gridConfig.loadingItems)].map((_, index) => (
            <Card key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
              <CardContent className={viewMode === 'grid' ? "p-0" : "p-4 flex items-center gap-4"}>
                <Skeleton 
                  className={viewMode === 'grid' 
                    ? "h-48 w-full mb-4 bg-gray-800" 
                    : "h-16 w-16 bg-gray-800"
                  } 
                />
                <div className={viewMode === 'grid' ? "p-4" : ""}>
                  <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
                  <Skeleton className="h-4 w-1/2 bg-gray-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-lg text-gray-400">
            {gridConfig.emptyStateMessage}
            {searchQuery && ' matching your search'}
          </p>
          {!showAccounts && accountsCount > 0 && !searchQuery && (
            <p className="mt-2 text-sm text-gray-500">
              Note: Accounts are hidden. Click "Show Accounts" to view them.
            </p>
          )}
        </div>
      )}
      
      {/* Grid/List view */}
      {!loading && !error && filteredItems.length > 0 && (
        viewMode === 'grid' ? (
          <div className={getGridColumnsClass()}>
            {filteredItems.map(item => (
              <div key={item.id}>
                {customRenderItem(item)}
              </div>
            ))}
          </div>
        ) : (
          <List 
            items={filteredItems} 
            renderItem={customRenderItem}
          />
        )
      )}
      
      {/* Load more button - only show if using API data */}
      {!loading && !error && hasMore && !providedItems && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 bg-primary-dark hover:bg-gray-800 rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
      
      {/* Loading more indicator */}
      {loading && page > 1 && (
        <div className="flex justify-center mt-8">
          <div className="animate-pulse text-gray-400">Loading more...</div>
        </div>
      )}
    </div>
  );
}
