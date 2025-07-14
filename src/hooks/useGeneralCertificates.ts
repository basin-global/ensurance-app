import useSWR from 'swr';

export interface GeneralCertificate {
  contract_address: string;
  name: string;
  description?: string;
  symbol?: string;
  decimals?: number;
  chain: string;
  total_volume?: string;
  volume_24h?: string;
  market_cap?: string;
  creator_earnings?: any[];
  unique_holders?: number;
  last_market_update?: string;
  token_uri?: string;
  image_url?: string;
  is_specific?: boolean;
}

export interface GeneralCertificatesData {
  certificates: GeneralCertificate[];
  loading: boolean;
  error: Error | null;
  mutate: () => void;
  totalCertificates: number;
  getCertificateByAddress: (address: string) => GeneralCertificate | undefined;
  getCertificatesByChain: (chain: string) => GeneralCertificate[];
  refreshMarketData: (address: string) => Promise<void>;
}

export const useGeneralCertificates = (limit?: number, page?: number): GeneralCertificatesData => {
  // Build URL with optional pagination
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (page) params.append('page', page.toString());
  
  const url = `/api/general${params.toString() ? `?${params.toString()}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR<GeneralCertificate[]>(
    url,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 2, // 2 minutes
      refreshInterval: 1000 * 60 * 10, // 10 minutes for market data
    }
  );

  const certificates = data || [];
  
  // Computed values
  const totalCertificates = certificates.length;

  // Helper functions
  const getCertificateByAddress = (address: string): GeneralCertificate | undefined => {
    return certificates.find(cert => 
      cert.contract_address.toLowerCase() === address.toLowerCase()
    );
  };

  const getCertificatesByChain = (chain: string): GeneralCertificate[] => {
    return certificates.filter(cert => cert.chain === chain);
  };

  const refreshMarketData = async (address: string): Promise<void> => {
    try {
      const response = await fetch(`/api/general?address=${address}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Invalidate the cache to refetch fresh data
      mutate();
    } catch (err) {
      console.error('Failed to refresh market data:', err);
      throw err;
    }
  };

  return {
    certificates,
    loading: isLoading,
    error: error || null,
    mutate,
    totalCertificates,
    getCertificateByAddress,
    getCertificatesByChain,
    refreshMarketData,
  };
};

// Hook for a single certificate
export const useGeneralCertificate = (contractAddress: string) => {
  const { data, error, isLoading, mutate } = useSWR<GeneralCertificate>(
    contractAddress ? `/api/general?address=${contractAddress}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 2, // 2 minutes
    }
  );

  const refreshMarketData = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/general?address=${contractAddress}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      mutate();
    } catch (err) {
      console.error('Failed to refresh market data:', err);
      throw err;
    }
  };

  return {
    certificate: data,
    loading: isLoading,
    error: error || null,
    mutate,
    refreshMarketData,
  };
};