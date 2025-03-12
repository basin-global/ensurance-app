import React, { useState, useEffect } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export default function Search({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className,
  debounceMs = 300,
  autoFocus = false
}: SearchProps) {
  const [inputValue, setInputValue] = useState(value);

  // Update local state when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, onChange, value, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-[rgba(var(--foreground-rgb),0.5)]" />
      </div>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        className={cn(
          "w-full px-10 py-2 rounded-lg",
          "bg-[rgb(var(--background-rgb))]",
          "border border-[rgba(var(--foreground-rgb),0.1)]",
          "text-[rgb(var(--foreground-rgb))]",
          "placeholder:text-[rgba(var(--foreground-rgb),0.5)]",
          "focus:outline-none focus:ring-2 focus:ring-[rgba(var(--foreground-rgb),0.2)]",
          "transition-colors duration-200"
        )}
        placeholder={placeholder.toLowerCase()}
      />
      
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-3 flex items-center text-[rgba(var(--foreground-rgb),0.5)] hover:text-[rgba(var(--foreground-rgb),0.8)]"
          aria-label="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
