import { useState } from 'react';
import { ViewMode } from './types';
import { usePortfolioData } from './hooks/usePortfolioData';
import PortfolioGrid from './components/PortfolioGrid';
import PortfolioList from './components/PortfolioList';
import { Grid, List } from 'lucide-react';

interface PortfolioProps {
  tbaAddress: string;
}

export default function Portfolio({ tbaAddress }: PortfolioProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { tokens, isLoading, error } = usePortfolioData(tbaAddress);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="bg-gray-900/30 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Grid view"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Portfolio Content */}
      {viewMode === 'grid' ? (
        <PortfolioGrid tokens={tokens} />
      ) : (
        <PortfolioList tokens={tokens} />
      )}
    </div>
  );
} 