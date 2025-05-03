import { PortfolioToken } from '../types';
import Card from './Card';
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioGridProps {
  tokens: PortfolioToken[];
  isLoading?: boolean;
}

export default function PortfolioGrid({ tokens, isLoading = false }: PortfolioGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {[...Array(4)].map((_, index) => (
          <UICard key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
            </CardContent>
          </UICard>
        ))}
      </div>
    );
  }

  if (!tokens.length) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No tokens found in this portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {tokens.map((token) => (
        <UICard 
          key={token.address} 
          className="bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors"
        >
          <CardContent className="p-4">
            <Card 
              token={token}
              variant="grid"
            />
          </CardContent>
        </UICard>
      ))}
    </div>
  );
} 