import React from 'react';
import { useRouter } from 'next/navigation';
import { EnsureItem } from '../../types';
import { useFetchData } from '../../hooks/useFetchData';
import Grid from '../../components/grid';
import { GeneralCert } from '../../cards/general-cert';
import { SpecificCert } from '../../cards/specific-cert';

interface MarketsViewProps {
  walletAddress?: string;
  chainId?: string;
  urlPrefix?: string;
  className?: string;
  onItemClick?: (item: EnsureItem) => void;
}

export function MarketsView({
  walletAddress,
  chainId,
  urlPrefix = '',
  className,
  onItemClick,
}: MarketsViewProps) {
  const router = useRouter();

  // Fetch both types of certificates
  const { items, loading, error } = useFetchData({
    fetchCertificates: true,
    walletAddress,
    chainId,
  });

  // Custom render function to use different card components based on type
  const renderItem = (item: EnsureItem) => {
    if (item.type === 'generalCert') {
      return <GeneralCert item={item} viewMode="list" />;
    }
    if (item.type === 'specificCert') {
      return <SpecificCert item={item} viewMode="list" />;
    }
    return null;
  };

  // Handle item click
  const handleItemClick = (item: EnsureItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.url) {
      router.push(`${urlPrefix}${item.url}`);
    }
  };

  return (
    <Grid
      type="specificCert"
      items={items}
      urlPrefix={urlPrefix}
      config={{
        defaultViewMode: 'list',
        showSearch: true,
        showViewToggle: false,
        emptyStateMessage: 'No certificates found in the market',
        onItemClick: handleItemClick,
      }}
      className={className}
      renderItem={renderItem}
    />
  );
} 