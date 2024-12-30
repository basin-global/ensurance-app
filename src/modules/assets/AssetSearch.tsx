import React from 'react'

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
}

export function AssetSearch({ 
  searchQuery, 
  setSearchQuery, 
  placeholder = "Search assets..."
}: AssetSearchProps) {
  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="font-mono"
      />
    </div>
  )
}
