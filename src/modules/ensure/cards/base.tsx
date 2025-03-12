import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import Link from 'next/link'
import { BaseItem, ViewMode } from '../types'
import { cn } from '@/lib/utils'
import EnsureImage from '../components/image'

interface BaseCardProps {
  item: BaseItem;
  viewMode: ViewMode;
  className?: string;
  onClick?: () => void;
  renderContent?: (item: BaseItem) => React.ReactNode;
  renderFooter?: (item: BaseItem) => React.ReactNode;
  renderBadges?: (item: BaseItem) => React.ReactNode;
}

export default function Base({ 
  item, 
  viewMode, 
  className,
  onClick,
  renderContent,
  renderFooter,
  renderBadges
}: BaseCardProps) {
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (onClick) {
      return (
        <div 
          onClick={onClick} 
          className={cn(
            "cursor-pointer",
            className
          )}
        >
          {children}
        </div>
      );
    }
    
    if (item.url) {
      return (
        <Link 
          href={item.url} 
          className={className}
        >
          {children}
        </Link>
      );
    }
    
    return <div className={className}>{children}</div>;
  };
  
  // Grid view
  if (viewMode === 'grid') {
    return (
      <CardWrapper>
        <Card className="overflow-hidden bg-primary-dark border-gray-800 transition-all duration-300 h-full rounded-xl hover:shadow-lg hover:-translate-y-1 hover:scale-105">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Image */}
            <div className="relative w-full bg-black">
              <div className="aspect-[1/1] relative">
                <EnsureImage 
                  src={item.image || ''}
                  entityType={item.type}
                  tokenId={item.tokenId}
                  groupName={item.ogName}
                  alt={item.name}
                  variant="square"
                />
              </div>
              
              {/* Badges (top-right corner) */}
              {renderBadges && (
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {renderBadges(item)}
                </div>
              )}
              
              {/* Quantity badge (top-left corner) */}
              {item.quantity && item.quantity > 1 && (
                <div className="absolute top-2 left-2 bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-extrabold shadow-md backdrop-blur-sm">
                  ×{item.quantity}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="p-4 flex-grow">
              <h3 className="font-bold text-lg line-clamp-1 text-gray-100">
                {item.name}
              </h3>
              
              {item.description && (
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                  {item.description}
                </p>
              )}
              
              {/* Custom content */}
              {renderContent && (
                <div className="mt-2">
                  {renderContent(item)}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {renderFooter && (
              <div className="px-4 pb-4 mt-auto">
                {renderFooter(item)}
              </div>
            )}
          </CardContent>
        </Card>
      </CardWrapper>
    );
  }
  
  // List view
  return (
    <CardWrapper>
      <Card className="bg-primary-dark border-gray-800 transition-colors duration-300 hover:bg-gray-900 hover:border-gray-700">
        <CardContent className="p-4 flex items-center gap-4">
          {/* Image */}
          <div className="relative w-16 h-16 flex-shrink-0 bg-black rounded-md overflow-hidden">
            <EnsureImage 
              src={item.image || ''}
              entityType={item.type}
              tokenId={item.tokenId}
              groupName={item.ogName}
              alt={item.name}
              variant="square"
              className="w-16 h-16"
            />
            
            {/* Quantity badge */}
            {item.quantity && item.quantity > 1 && (
              <div className="absolute bottom-0 right-0 bg-black/80 text-white px-1 py-0.5 text-xs font-bold">
                ×{item.quantity}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg line-clamp-1 text-gray-100">
                {item.name}
              </h3>
              
              {/* Badges */}
              {renderBadges && (
                <div className="flex items-center gap-1">
                  {renderBadges(item)}
                </div>
              )}
            </div>
            
            {item.description && (
              <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                {item.description}
              </p>
            )}
            
            {/* Custom content */}
            {renderContent && (
              <div className="mt-2">
                {renderContent(item)}
              </div>
            )}
          </div>
          
          {/* Footer (right side in list view) */}
          {renderFooter && (
            <div className="ml-auto pl-4">
              {renderFooter(item)}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
