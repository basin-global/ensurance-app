import useSWR from 'swr';

export interface EthPriceData {
  price: number;
  symbol: string;
  lastUpdated: number;
}

export interface EthPriceHook {
  price: number | null;
  loading: boolean;
  error: Error | null;
  mutate: () => void;
  formattedPrice: string;
  priceChange24h?: number;
  lastUpdated: Date | null;
}

export const useEthPrice = (): EthPriceHook => {
  const { data, error, isLoading, mutate } = useSWR<EthPriceData>(
    '/api/eth-price',
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // Revalidate on reconnect for price updates
      dedupingInterval: 1000 * 30, // 30 seconds - prices change frequently
      refreshInterval: 1000 * 60, // 1 minute - update price every minute
      keepPreviousData: true, // Keep previous price while loading new one
    }
  );

  const price = data?.price || null;
  const lastUpdated = data?.lastUpdated ? new Date(data.lastUpdated * 1000) : null;

  // Format price with 2 decimal places
  const formattedPrice = price ? `$${price.toFixed(2)}` : '--';

  return {
    price,
    loading: isLoading,
    error: error || null,
    mutate,
    formattedPrice,
    lastUpdated,
  };
};

// Hook for multiple token prices (if needed in the future)
export const useTokenPrices = (addresses: string[]) => {
  const { data, error, isLoading, mutate } = useSWR<Record<string, number>>(
    addresses.length > 0 ? `/api/token-prices?addresses=${addresses.join(',')}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000 * 60, // 1 minute
      refreshInterval: 1000 * 60 * 5, // 5 minutes
    }
  );

  return {
    prices: data || {},
    loading: isLoading,
    error: error || null,
    mutate,
  };
};