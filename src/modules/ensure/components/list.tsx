import React from 'react'
import { EnsureItem } from '../types'
import Base from '../cards/base'
import { cn } from '@/lib/utils'

interface ListProps {
  items: EnsureItem[];
  renderItem?: (item: EnsureItem) => React.ReactNode;
  className?: string;
}

export default function List({ items, renderItem, className }: ListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map(item => (
        <div key={item.id}>
          {renderItem ? (
            renderItem(item)
          ) : (
            <Base 
              item={item} 
              viewMode="list" 
            />
          )}
        </div>
      ))}
    </div>
  )
}
