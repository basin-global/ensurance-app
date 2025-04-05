import React from 'react'
import { cn } from '@/lib/utils'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  typewriterWords?: { text: string }[];
  className?: string;
}

export function AssetSearch({ 
  searchQuery, 
  setSearchQuery, 
  placeholder = "search assets...",
  autoFocus,
  typewriterWords,
  className
}: AssetSearchProps) {
  return (
    <div className={cn("w-full max-w-md relative", className)}>
      <input
        type="text"
        placeholder={typewriterWords ? '' : placeholder.toLowerCase()}
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
      {typewriterWords && !searchQuery && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <TypewriterEffect 
            words={typewriterWords} 
            className="opacity-50 [&>div>span]:!text-base [&>div>span]:!tracking-normal [&>div>span]:!font-normal" 
          />
        </div>
      )}
    </div>
  )
}
