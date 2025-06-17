import { useState, useMemo } from 'react';
import { ViewMode, TokenFilter, SortConfig, SortField, PortfolioToken } from './types';
import { usePortfolioData } from './hooks/usePortfolioData';
import PortfolioGrid from './components/PortfolioGrid';
import PortfolioList from './components/PortfolioList';
import { Grid, List, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUnits } from 'viem';

interface PortfolioProps {
  tbaAddress: string;
  isOwner?: boolean;
  isDeployed?: boolean;
}

const SORT_CYCLES: SortField[] = ['name', 'balance', 'value'];

export default function Portfolio({ tbaAddress, isOwner = false, isDeployed = false }: PortfolioProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<TokenFilter>('all');
  const [sort, setSort] = useState<SortConfig>({ field: 'value', direction: 'desc' });
  
  const { tokens: rawTokens, isLoading, error } = usePortfolioData(tbaAddress);

  const options = [
    { value: 'all', label: 'portfolio' },
    { value: 'currency', label: 'currency' },
    { value: 'assets', label: 'assets' }
  ];

  // Step 1: Use all tokens from the endpoint, no initial filtering
  const uniqueTokens = useMemo(() => {
    if (!rawTokens) return [];
    // Create a Map to dedupe tokens by address and type
    const tokenMap = new Map();
    rawTokens.forEach(token => {
      const key = `${token.address}-${token.type}${token.type === 'erc721' || token.type === 'erc1155' ? `-${token.tokenId}` : ''}`;
      tokenMap.set(key, token);
    });
    return Array.from(tokenMap.values());
  }, [rawTokens]);

  // Step 2: Only filter based on user selection
  const filteredTokens = useMemo(() => {
    if (!uniqueTokens?.length) return [];
    
    return uniqueTokens.filter(token => {
      switch (filter) {
        case 'currency':
          return token.type === 'native' || token.type === 'erc20';
        case 'assets':
          return token.type === 'erc721' || token.type === 'erc1155';
        case 'all':
        default:
          return true;
      }
    });
  }, [uniqueTokens, filter]); // Depend on both uniqueTokens and filter

  // Step 3: Sort the filtered tokens
  const sortedTokens = useMemo(() => {
    if (!filteredTokens?.length) return [];
    
    return [...filteredTokens].sort((a, b) => {
      switch (sort.field) {
        case 'name':
          const aName = (a.type === 'erc721' || a.type === 'erc1155' ? a.name : a.symbol)?.toLowerCase() || '';
          const bName = (b.type === 'erc721' || b.type === 'erc1155' ? b.name : b.symbol)?.toLowerCase() || '';
          return sort.direction === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
        
        case 'balance':
        case 'value':
          const aValue = sort.field === 'balance' 
            ? parseFloat(formatUnits(BigInt(a.balance), a.decimals))
            : a.value?.usd || 0;
          const bValue = sort.field === 'balance'
            ? parseFloat(formatUnits(BigInt(b.balance), b.decimals))
            : b.value?.usd || 0;
          return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        
        default:
          return 0;
      }
    });
  }, [filteredTokens, sort]); // Depend on filteredTokens and sort

  const handleSortClick = () => {
    const fields = SORT_CYCLES;
    const currentIndex = fields.indexOf(sort.field);
    
    // Move to next field, or back to first if at end
    const nextField = fields[(currentIndex + 1) % fields.length];
    
    // Set direction based on field type
    setSort({
      field: nextField,
      direction: nextField === 'name' ? 'asc' : 'desc'
    });
  };

  const getSortLabel = () => {
    const labels = {
      name: 'Sort by name (A-Z)',
      balance: 'Sort by balance (High-Low)',
      value: 'Sort by value (High-Low)'
    };
    return labels[sort.field];
  };

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
      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        {/* Filter Dropdown as Heading */}
        <Select value={filter} onValueChange={(value) => setFilter(value as TokenFilter)}>
          <SelectTrigger className="text-xl font-medium bg-transparent border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none pl-0 pr-2 h-auto w-auto">
            <SelectValue placeholder="portfolio" />
          </SelectTrigger>
          <SelectContent className="bg-[#000] border-gray-800">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-[#111] focus:bg-[#111] cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View and Sort Controls */}
        <div className="flex gap-2">
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

          <button
            onClick={handleSortClick}
            className="bg-gray-900/30 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
            title={getSortLabel()}
          >
            <ArrowUpDown 
              className={`w-5 h-5 transition-transform ${sort.direction === 'desc' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Portfolio Content */}
      {viewMode === 'grid' ? (
        <PortfolioGrid 
          tokens={sortedTokens} 
          tbaAddress={tbaAddress} 
          isOwner={isOwner}
          isDeployed={isDeployed}
        />
      ) : (
        <PortfolioList 
          tokens={sortedTokens} 
          tbaAddress={tbaAddress} 
          isOwner={isOwner}
          isDeployed={isDeployed}
        />
      )}
    </div>
  );
}