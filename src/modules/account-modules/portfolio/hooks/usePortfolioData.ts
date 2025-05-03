import { useState, useEffect } from 'react';
import { PortfolioToken } from '../types';
import { formatUnits } from 'viem';
import { getTokenImage } from '../utils/getTokenImage';

export function usePortfolioData(tbaAddress: string) {
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!tbaAddress) {
        setError('No address provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/alchemy/fungible?address=${tbaAddress}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch token data');
        }

        const responseData = await response.json();
        
        // Transform and fetch images for each token
        const transformedTokens = await Promise.all(
          responseData.data.tokens.map(async (token: any) => {
            const isNative = !token.tokenAddress;
            const price = token.tokenPrices?.[0]?.value;
            const decimals = token.tokenMetadata?.decimals || 18;
            
            // Skip tokens with zero balance
            if (token.tokenBalance === '0x0000000000000000000000000000000000000000000000000000000000000000') {
              return null;
            }
            
            // Convert balance from hex to decimal considering token decimals
            const formattedBalance = formatUnits(BigInt(token.tokenBalance), decimals);
            
            // Calculate total value in USD
            const totalValue = price ? parseFloat(formattedBalance) * parseFloat(price) : null;

            // For image lookup, use tokenAddress for all tokens (including native)
            // This ensures we match the contract_address in our general certificates table
            const imageUrl = await getTokenImage(
              token.tokenAddress || token.address,
              token.tokenMetadata?.symbol || 'ETH'
            );

            return {
              type: isNative ? 'native' : 'erc20',
              address: isNative ? token.address : token.tokenAddress,
              symbol: token.tokenMetadata?.symbol || 'ETH',
              name: token.tokenMetadata?.name || 'Ethereum',
              balance: token.tokenBalance,
              decimals,
              value: {
                usd: totalValue
              },
              ...(isNative ? {} : { contractAddress: token.tokenAddress }),
              metadata: {
                name: token.tokenMetadata?.name || 'Ethereum',
                image: imageUrl
              }
            };
          })
        ).then(tokens => tokens.filter(Boolean)); // Remove null entries

        setTokens(transformedTokens);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch token data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [tbaAddress]);

  return {
    tokens,
    isLoading,
    error
  };
} 