import React from 'react'

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  className?: string;
  isAccountSearch?: boolean;
}

export function AssetSearch({ 
  searchQuery, 
  setSearchQuery, 
  placeholder = "Search assets...",
  className = "",
  isAccountSearch = false
}: AssetSearchProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white bg-white dark:bg-gray-700
          ${isAccountSearch ? 'font-mono font-bold' : 'font-sans'}`}
      />
    </div>
  )
}
