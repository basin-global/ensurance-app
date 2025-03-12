import React from 'react'
import { Grid, List } from 'lucide-react'
import { ViewMode } from '../types'
import { cn } from '@/lib/utils'

interface ViewProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export default function View({ mode, onChange, className }: ViewProps) {
  return (
    <div className={cn("flex items-center space-x-1 bg-primary-dark rounded-lg p-1", className)}>
      <button
        onClick={() => onChange('grid')}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          mode === 'grid' 
            ? "bg-primary text-primary-foreground" 
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
        )}
        aria-label="Grid view"
      >
        <Grid className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => onChange('list')}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          mode === 'list' 
            ? "bg-primary text-primary-foreground" 
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
        )}
        aria-label="List view"
      >
        <List className="h-5 w-5" />
      </button>
    </div>
  )
}
