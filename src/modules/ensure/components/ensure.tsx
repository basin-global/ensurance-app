'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { EntityType, ViewMode, EnsureGridConfig, EnsureItem } from '../types'
import { useFetchData } from '../hooks/useFetchData'
import Grid from './grid'

export type EnsureVariant = 
  | 'home'           // All entity types for homepage
  | 'certificates'   // Only certificate types
  | 'syndicates'     // Only syndicate types
  | 'markets'        // Market view (likely row-based)
  | 'custom';        // Custom configuration

interface EnsureProps {
  variant?: EnsureVariant;
  fetchGroups?: boolean;
  fetchAccounts?: boolean;
  fetchCertificates?: boolean;
  fetchSyndicates?: boolean;
  fetchPools?: boolean;
  walletAddress?: string;
  groupName?: string;
  chainId?: string;
  urlPrefix?: string;
  viewMode?: ViewMode;
  showSearch?: boolean;
  showViewToggle?: boolean;
  showAccounts?: boolean;
  emptyStateMessage?: string;
  className?: string;
  onItemClick?: (item: EnsureItem) => void;
}

export default function Ensure({
  variant = 'custom',
  fetchGroups,
  fetchAccounts,
  fetchCertificates,
  fetchSyndicates,
  fetchPools,
  walletAddress,
  groupName,
  chainId,
  urlPrefix = '',
  viewMode,
  showSearch,
  showViewToggle,
  showAccounts,
  emptyStateMessage,
  className,
  onItemClick,
}: EnsureProps) {
  const router = useRouter();
  
  // Set defaults based on variant
  const variantConfig = useMemo(() => {
    // Default configuration
    const baseConfig = {
      fetchGroups: false,
      fetchAccounts: false,
      fetchCertificates: false,
      fetchSyndicates: false,
      fetchPools: false,
      viewMode: 'grid' as ViewMode,
      showSearch: true,
      showViewToggle: true,
      showAccounts: false,
      emptyStateMessage: 'No items found',
    };
    
    // Override with variant-specific defaults
    switch (variant) {
      case 'home':
        return {
          ...baseConfig,
          fetchGroups: true,
          fetchAccounts: true,
          fetchCertificates: true,
          fetchPools: true,
          emptyStateMessage: 'No items found on your home page',
        };
      case 'certificates':
        return {
          ...baseConfig,
          fetchCertificates: true,
          viewMode: 'grid',
          emptyStateMessage: 'No certificates found',
        };
      case 'syndicates':
        return {
          ...baseConfig,
          fetchSyndicates: true,
          viewMode: 'grid',
          emptyStateMessage: 'No syndicates found',
        };
      case 'markets':
        return {
          ...baseConfig,
          fetchGroups: true,
          fetchCertificates: true,
          fetchSyndicates: true,
          viewMode: 'list',
          emptyStateMessage: 'No market items found',
        };
      default:
        return baseConfig;
    }
  }, [variant]);
  
  // Override defaults with any explicitly provided props
  const finalConfig = {
    ...variantConfig,
    fetchGroups: fetchGroups ?? variantConfig.fetchGroups,
    fetchAccounts: fetchAccounts ?? variantConfig.fetchAccounts,
    fetchCertificates: fetchCertificates ?? variantConfig.fetchCertificates,
    fetchSyndicates: fetchSyndicates ?? variantConfig.fetchSyndicates,
    fetchPools: fetchPools ?? variantConfig.fetchPools,
    viewMode: viewMode ?? variantConfig.viewMode,
    showSearch: showSearch ?? variantConfig.showSearch,
    showViewToggle: showViewToggle ?? variantConfig.showViewToggle,
    showAccounts: showAccounts ?? variantConfig.showAccounts,
    emptyStateMessage: emptyStateMessage ?? variantConfig.emptyStateMessage,
  };
  
  // Fetch data based on configuration
  const { items, loading, error } = useFetchData({
    fetchGroups: finalConfig.fetchGroups,
    fetchAccounts: finalConfig.fetchAccounts,
    fetchCertificates: finalConfig.fetchCertificates,
    fetchSyndicates: finalConfig.fetchSyndicates,
    fetchPools: finalConfig.fetchPools,
    walletAddress,
    groupName,
    chainId,
  });
  
  // Handle item click if not provided
  const handleItemClick = (item: EnsureItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.url) {
      router.push(`${urlPrefix}${item.url}`);
    }
  };
  
  // Determine entity type for Grid (used for placeholder text)
  const determineEntityType = (): EntityType => {
    if (finalConfig.fetchCertificates && !finalConfig.fetchGroups && !finalConfig.fetchAccounts && !finalConfig.fetchSyndicates && !finalConfig.fetchPools) {
      return 'specificCert';
    }
    if (finalConfig.fetchSyndicates && !finalConfig.fetchGroups && !finalConfig.fetchAccounts && !finalConfig.fetchCertificates && !finalConfig.fetchPools) {
      return 'syndicate';
    }
    if (finalConfig.fetchGroups && !finalConfig.fetchAccounts && !finalConfig.fetchCertificates && !finalConfig.fetchSyndicates && !finalConfig.fetchPools) {
      return 'group';
    }
    return 'group'; // Default
  };
  
  // Render the Grid with the fetched data
  return (
    <Grid 
      type={determineEntityType()}
      items={items}
      urlPrefix={urlPrefix}
      config={{
        defaultViewMode: finalConfig.viewMode as ViewMode,
        showSearch: finalConfig.showSearch,
        showViewToggle: finalConfig.showViewToggle,
        showAccounts: finalConfig.showAccounts,
        emptyStateMessage: finalConfig.emptyStateMessage,
        onItemClick: handleItemClick,
      }}
      className={className}
    />
  );
} 