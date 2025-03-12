import { useState, useEffect, useCallback } from 'react'
import { 
  EntityType, 
  EnsureItem, 
  GroupItem, 
  AccountItem, 
  GeneralCertItem, 
  SpecificCertItem, 
  SyndicateItem, 
  PoolItem, 
  PropertyItem 
} from '../types'

interface UseDataProps {
  type: EntityType;
  searchQuery?: string;
  walletAddress?: string;
  groupName?: string;
  chainId?: string;
  limit?: number;
  page?: number;
}

export function useData({
  type,
  searchQuery = '',
  walletAddress,
  groupName,
  chainId,
  limit = 20,
  page = 1
}: UseDataProps) {
  const [items, setItems] = useState<EnsureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch data based on entity type
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      let queryParams = new URLSearchParams();
      
      // Add common query parameters
      if (searchQuery) queryParams.append('search', searchQuery);
      if (limit) queryParams.append('limit', limit.toString());
      if (page) queryParams.append('page', page.toString());
      
      // Determine endpoint and params based on entity type
      switch (type) {
        case 'group':
          endpoint = '/api/groups';
          break;
          
        case 'account':
          endpoint = '/api/accounts';
          if (groupName) queryParams.append('group', groupName);
          break;
          
        case 'generalCert':
        case 'specificCert':
          endpoint = '/api/ensurance';
          if (walletAddress) queryParams.append('address', walletAddress);
          if (chainId) queryParams.append('chain', chainId);
          if (type === 'generalCert') queryParams.append('type', 'erc20');
          if (type === 'specificCert') queryParams.append('type', 'erc1155');
          break;
          
        case 'syndicate':
          endpoint = '/api/syndicates/vaults';
          break;
          
        case 'pool':
          endpoint = '/api/accounts';
          queryParams.append('type', 'pool');
          if (groupName) queryParams.append('group', groupName);
          break;
          
        case 'property':
          endpoint = '/api/properties';
          break;
          
        default:
          throw new Error(`Unsupported entity type: ${type}`);
      }
      
      // Build the full URL
      const url = `${endpoint}?${queryParams.toString()}`;
      
      // Fetch data
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${type} data`);
      
      const data = await response.json();
      
      // Transform data to appropriate format
      const transformedItems = transformData(data, type);
      
      // Update state
      setItems(prev => page > 1 ? [...prev, ...transformedItems] : transformedItems);
      setTotalItems(data.total || transformedItems.length);
      setHasMore(transformedItems.length === limit);
      
    } catch (err) {
      console.error(`Error fetching ${type} data:`, err);
      setError(`Failed to load ${type} data`);
    } finally {
      setLoading(false);
    }
  }, [type, searchQuery, walletAddress, groupName, chainId, limit, page]);

  // Transform API data to our internal format
  const transformData = (data: any, type: EntityType): EnsureItem[] => {
    // Handle array or object response
    const items = Array.isArray(data) ? data : data.items || data.nfts || [data];
    
    switch (type) {
      case 'group':
        return items.map((item: any): GroupItem => ({
          id: item.og_name,
          type: 'group',
          name: item.og_name,
          description: item.description,
          image: `/groups/orbs/${item.og_name.replace(/^\./, '')}-orb.png`,
          url: `/groups/${item.og_name.replace(/^\./, '')}/all`,
          contractAddress: item.contract_address,
          ogName: item.og_name,
          tagline: item.tagline,
          totalSupply: item.total_supply,
          isActive: item.is_active
        }));
        
      case 'account':
        return items.map((item: any): AccountItem => ({
          id: item.full_account_name,
          type: 'account',
          name: item.display_name || item.full_account_name,
          description: item.description,
          image: `/api/accounts/${item.full_account_name}/image`,
          url: `/${item.full_account_name}`,
          tokenId: item.token_id,
          ogName: item.og_name,
          tbaAddress: item.tba_address,
          isAgent: item.is_agent,
          ownerAddress: item.owner_of
        }));
        
      case 'generalCert':
        return items.map((item: any): GeneralCertItem => ({
          id: `${item.chain}-${item.contract_address}-${item.token_id}`,
          type: 'generalCert',
          name: item.name || 'Untitled Certificate',
          description: item.description,
          image: item.image_url,
          url: `/certificates/${item.chain}/${item.token_id}`,
          chain: item.chain,
          contractAddress: item.contract_address,
          tokenId: item.token_id,
          symbol: item.symbol,
          decimals: item.decimals || 18,
          balance: item.queried_wallet_balances?.[0]?.quantity_string,
          quantity: item.queried_wallet_balances?.[0]?.quantity || 0,
          valueUsd: parseFloat(item.queried_wallet_balances?.[0]?.value_usd_string || '0'),
          isOwned: !!item.queried_wallet_balances?.length,
          isEnsured: true
        }));
        
      case 'specificCert':
        return items.map((item: any): SpecificCertItem => ({
          id: `${item.chain}-${item.contract_address}-${item.token_id}`,
          type: 'specificCert',
          name: item.name || 'Untitled Certificate',
          description: item.description,
          image: item.image_url,
          url: `/certificates/${item.chain}/${item.token_id}`,
          chain: item.chain,
          contractAddress: item.contract_address,
          tokenId: item.token_id,
          quantity: item.queried_wallet_balances?.[0]?.quantity || 0,
          valueUsd: parseFloat(item.queried_wallet_balances?.[0]?.value_usd_string || '0'),
          isOwned: !!item.queried_wallet_balances?.length,
          isEnsured: true,
          metadata: item.metadata
        }));
        
      case 'syndicate':
        return items.map((item: any): SyndicateItem => ({
          id: item.id,
          type: 'syndicate',
          name: item.name,
          description: item.description,
          image: item.image_url,
          url: `/syndicates/vaults/${item.id}`,
          targetYield: item.targetYield,
          actualYield: item.actualYield,
          deposits: item.deposits,
          currency: item.currency,
          impact: item.impact,
          impactTags: item.impactTags
        }));
        
      case 'pool':
        return items.map((item: any): PoolItem => ({
          id: item.full_account_name,
          type: 'pool',
          name: item.display_name || item.full_account_name,
          description: item.description,
          image: `/api/accounts/${item.full_account_name}/image`,
          url: `/${item.full_account_name}`,
          tokenId: item.token_id,
          ogName: item.og_name,
          poolType: item.pool_type === 'stock' ? 'stock' : 'flow',
          totalCurrencyValue: item.total_currency_value,
          totalAssets: item.total_assets,
          ensuredAssets: item.ensured_assets
        }));
        
      case 'property':
        return items.map((item: any): PropertyItem => ({
          id: item.id,
          type: 'property',
          name: item.name,
          description: item.description,
          image: item.image_url,
          url: `/properties/${item.id}`,
          location: item.location,
          size: item.size,
          sizeUnit: item.size_unit,
          propertyType: item.property_type,
          attributes: item.attributes
        }));
        
      default:
        return [];
    }
  };

  // Load more data
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return page + 1;
    }
    return page;
  }, [loading, hasMore, page]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    loading,
    error,
    hasMore,
    totalItems,
    loadMore,
    refresh: fetchData
  };
}
