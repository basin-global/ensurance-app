import React from 'react'
import { cn } from '@/lib/utils'

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AssetSearch({ 
  searchQuery, 
  setSearchQuery, 
  placeholder = "search assets...",
  autoFocus
}: AssetSearchProps) {
  return (
    <div className="w-full max-w-md">
      <input
        type="text"
        placeholder={placeholder.toLowerCase()}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus={autoFocus}
        className={cn(
          "w-full px-4 py-2 rounded-lg text-center",
          "bg-[rgb(var(--background-rgb))]",
          "border border-[rgba(var(--foreground-rgb),0.1)]",
          "text-[rgb(var(--foreground-rgb))]",
          "placeholder:text-[rgba(var(--foreground-rgb),0.5)]",
          "focus:outline-none focus:ring-2 focus:ring-[rgba(var(--foreground-rgb),0.2)]",
          "transition-colors duration-200"
        )}
      />
    </div>
  )
}
