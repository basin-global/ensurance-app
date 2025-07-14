import useSWR from 'swr';

export interface QuoteRequest {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker: string;
  slippageBps?: string;
  swapFeeBps?: string;
}

export interface QuoteResponse {
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  allowanceTarget?: string;
  price?: string;
  estimatedGas?: string;
  gas?: string;
  gasPrice?: string;
  data?: string;
  to?: string;
  value?: string;
  sources?: Array<{ name: string; proportion: string }>;
  fees?: {
    integratorFee?: { amount: string; type: string; token: string; } | null;
    zeroExFee?: { amount: string; type: string; token: string; } | null;
  };
  zid?: string;
  liquidityAvailable?: boolean;
  transaction?: {
    to?: string;
    data?: string;
    value?: string;
    gas?: string;
    gasPrice?: string;
  };
  permit2?: {
    type?: string;
    hash?: string;
    eip712?: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: Record<string, any>;
      primaryType: string;
      message: Record<string, any>;
    };
  };
}

export interface TradingHook {
  quote: QuoteResponse | null;
  loading: boolean;
  error: Error | null;
  getQuote: (request: QuoteRequest) => Promise<QuoteResponse>;
  clearQuote: () => void;
}

export const use0xTrading = (): TradingHook => {
  const { data: quote, error, isLoading, mutate } = useSWR<QuoteResponse>(
    null, // No initial data
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 30, // 30 seconds for quotes
    }
  );

  const getQuote = async (request: QuoteRequest): Promise<QuoteResponse> => {
    try {
      const params = new URLSearchParams({
        action: 'quote',
        sellToken: request.sellToken,
        buyToken: request.buyToken,
        sellAmount: request.sellAmount,
        taker: request.taker,
        slippageBps: request.slippageBps || '200',
        swapFeeBps: request.swapFeeBps || '100',
      });

      const response = await fetch(`/api/0x?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const quoteData = await response.json();
      
      // Update the SWR cache
      mutate(quoteData, false);
      
      return quoteData;
    } catch (err) {
      console.error('Failed to get quote:', err);
      throw err;
    }
  };

  const clearQuote = () => {
    mutate(null, false);
  };

  return {
    quote: quote || null,
    loading: isLoading,
    error: error || null,
    getQuote,
    clearQuote,
  };
};

// Hook for getting a quote with automatic request
export const use0xQuote = (request: QuoteRequest | null) => {
  const { data, error, isLoading, mutate } = useSWR<QuoteResponse>(
    request ? `/api/0x?action=quote&${new URLSearchParams({
      sellToken: request.sellToken,
      buyToken: request.buyToken,
      sellAmount: request.sellAmount,
      taker: request.taker,
      slippageBps: request.slippageBps || '200',
      swapFeeBps: request.swapFeeBps || '100',
    }).toString()}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 30, // 30 seconds
      refreshInterval: 1000 * 60, // 1 minute - refresh quotes
    }
  );

  return {
    quote: data || null,
    loading: isLoading,
    error: error || null,
    mutate,
  };
};