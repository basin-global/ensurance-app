'use client'

import { useState, useEffect } from 'react'
import { 
  EnsureItem, 
  EntityType, 
  GeneralCertItem, 
  AccountItem, 
  PoolItem 
} from '../types'

interface UseFetchDataProps {
  fetchGroups?: boolean;
  fetchAccounts?: boolean;
  fetchCertificates?: boolean;
  fetchSyndicates?: boolean;
  fetchPools?: boolean;
  walletAddress?: string;
  groupName?: string;
  chainId?: string;
}

export function useFetchData({
  fetchGroups = false,
  fetchAccounts = false,
  fetchCertificates = false,
  fetchSyndicates = false,
  fetchPools = false,
  walletAddress,
  groupName,
  chainId,
}: UseFetchDataProps) {
  const [items, setItems] = useState<EnsureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const allItems: EnsureItem[] = [];
        
        // Fetch groups if enabled
        if (fetchGroups) {
          const groupsData = await fetch('/api/groups').then(res => res.json());
          const groups = groupsData.map((item: any) => ({
            id: item.group_name,
            type: 'group' as EntityType,
            name: item.group_name,
            description: item.tagline || 'Group',
            image: `/groups/orbs/${item.group_name.replace(/^\./, '')}-orb.png`,
            url: `/groups/${item.group_name.replace(/^\./, '')}/all`,
            contractAddress: item.contract_address,
            groupName: item.group_name,
            totalSupply: item.total_supply,
            isActive: item.is_active
          }));
          allItems.push(...groups);
        }
        
        // Fetch accounts if enabled
        if (fetchAccounts) {
          // Build query params for accounts
          const accountParams = new URLSearchParams();
          if (groupName) accountParams.append('group_name', groupName);
          if (walletAddress) accountParams.append('owner', walletAddress);
          
          const accountsUrl = `/api/accounts${accountParams.toString() ? `?${accountParams.toString()}` : ''}`;
          const accountsData = await fetch(accountsUrl).then(res => res.json());
          
          const accounts = accountsData
            .filter((item: any) => !item.pool_type) // Filter out pools
            .map((item: any): AccountItem => ({
              id: item.full_account_name,
              type: 'account',
              name: item.display_name || item.full_account_name,
              description: `${item.group_name} account`,
              image: `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${item.group_name.replace(/^\./, '')}/${item.token_id}.png`,
              url: `/${item.full_account_name}`,
              tokenId: item.token_id,
              groupName: item.group_name,
              isAgent: item.is_agent,
              ownerAddress: item.owner_address
            }));
          allItems.push(...accounts);
          
          // Fetch pools from accounts if enabled
          if (fetchPools) {
            const pools = accountsData
              .filter((item: any) => item.pool_type)
              .map((item: any): PoolItem => ({
                id: item.full_account_name,
                type: 'pool',
                name: item.display_name || item.full_account_name,
                description: `${item.group_name} pool`,
                image: `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${item.group_name.replace(/^\./, '')}/${item.token_id}.png`,
                url: `/${item.full_account_name}`,
                tokenId: item.token_id,
                groupName: item.group_name,
                poolType: item.pool_type === 'stock' ? 'stock' : 'flow',
                totalCurrencyValue: item.total_currency_value,
                totalAssets: item.total_assets,
                ensuredAssets: item.ensured_assets
              }));
            allItems.push(...pools);
          }
        }
        
        // Fetch certificates if enabled
        if (fetchCertificates) {
          try {
            // Build query params for certificates
            const certParams = new URLSearchParams();
            if (walletAddress) certParams.append('owner', walletAddress);
            if (chainId) certParams.append('chain', chainId);
            
            // Fetch all certificates in one call
            const certsUrl = `/api/certificates${certParams.toString() ? `?${certParams.toString()}` : ''}`;
            const response = await fetch(certsUrl);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'Failed to fetch certificates');
            }
            
            const certsData = await response.json();
            
            // Ensure we have an array to work with
            const certItems = Array.isArray(certsData) ? certsData : [];
            
            // Process certificates based on their type
            const certificates = certItems.map((item: any): GeneralCertItem => {
              const baseProps = {
                id: `${item.chain}-${item.contract_address}${item.token_id ? `-${item.token_id}` : ''}`,
                type: 'generalCert' as const,
                name: item.name,
                description: item.description,
                image: item.image,
                url: `/certificates/${item.chain}/${item.contract_address}`,
                symbol: item.symbol,
                decimals: item.decimals,
                chain: item.chain,
                contractAddress: item.contract_address,
                tokenId: item.token_id || 0,
                isEnsured: item.is_ensured
              };
              return baseProps;
            });
            
            allItems.push(...certificates);
          } catch (err) {
            console.error('Error fetching certificates:', err);
            // Continue with other data even if certificates fail
          }
        }
        
        // Fetch syndicates if enabled
        if (fetchSyndicates) {
          try {
            const syndicatesData = await fetch('/api/syndicates').then(res => res.json());
            const syndicates = syndicatesData.map((item: any) => ({
              id: item.id || `syndicate-${item.name}`,
              type: 'syndicate' as EntityType,
              name: item.name,
              description: item.description || 'Syndicate',
              image: item.image_url || 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png',
              url: `/syndicates/${item.id}`,
              targetYield: item.target_yield,
              actualYield: item.actual_yield,
              deposits: item.deposits,
              currency: item.currency || 'USDC',
              impact: item.impact,
              impactTags: item.impact_tags
            }));
            allItems.push(...syndicates);
          } catch (err) {
            console.warn('Failed to fetch syndicates:', err);
            // Continue with other data even if syndicates fail
          }
        }
        
        setItems(allItems);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [fetchGroups, fetchAccounts, fetchCertificates, fetchSyndicates, fetchPools, walletAddress, groupName, chainId]);

  return { items, loading, error };
} 