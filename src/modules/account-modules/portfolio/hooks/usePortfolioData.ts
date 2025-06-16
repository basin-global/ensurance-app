import { useState, useEffect } from 'react';
import { PortfolioToken } from '../types';
import { formatUnits } from 'viem';
import { getTokenImage } from '../utils/getTokenImage';
import { getPriceFloor } from '../utils/getPriceFloor';
import { getSalesData } from '../utils/getSalesData';

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

        // First get the spam list
        const spamResponse = await fetch('/api/config/spam');
        if (!spamResponse.ok) {
          throw new Error('Failed to fetch spam list');
        }
        const { addresses: spamAddresses } = await spamResponse.json();
        console.log('Spam addresses:', spamAddresses);

        // Fetch both fungible and non-fungible tokens in parallel
        const [fungibleResponse, nonfungibleResponse] = await Promise.all([
          fetch(`/api/alchemy/fungible?address=${tbaAddress}`),
          fetch(`/api/alchemy/nonfungible?address=${tbaAddress}`)
        ]);

        if (!fungibleResponse.ok || !nonfungibleResponse.ok) {
          throw new Error('Failed to fetch token data');
        }

        const fungibleData = await fungibleResponse.json();
        const nonfungibleData = await nonfungibleResponse.json();

        // Transform fungible tokens (native + ERC20)
        const fungibleTokens = await Promise.all(
          fungibleData.data.tokens.map(async (token: any) => {
            // Identify ETH by null tokenAddress in Alchemy response
            const isNative = !token.tokenAddress;
            const price = token.tokenPrices?.[0]?.value;
            const decimals = token.tokenMetadata?.decimals || 18;
            
            // Skip tokens with zero balance
            if (token.tokenBalance === '0x0000000000000000000000000000000000000000000000000000000000000000') {
              return null;
            }

            // Skip spam tokens
            if (!isNative && spamAddresses.includes(token.tokenAddress.toLowerCase())) {
              console.log('Filtered out spam fungible token:', token.tokenAddress);
              return null;
            }
            
            // Convert balance from hex to decimal considering token decimals
            const formattedBalance = formatUnits(BigInt(token.tokenBalance), decimals);
            
            // Calculate total value in USD
            const totalValue = price ? parseFloat(formattedBalance) * parseFloat(price) : null;

            // For ETH, use direct image URL
            const imageUrl = isNative 
              ? 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg'
              : await getTokenImage(token.tokenAddress);

            return {
              type: isNative ? 'native' : 'erc20',
              address: isNative ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : token.tokenAddress,
              symbol: isNative ? 'ETH' : (token.tokenMetadata?.symbol || 'Unknown'),
              name: isNative ? 'Ethereum' : (token.tokenMetadata?.name || 'Unknown Token'),
              balance: token.tokenBalance,
              decimals,
              value: {
                usd: totalValue
              },
              metadata: {
                name: isNative ? 'Ethereum' : (token.tokenMetadata?.name || 'Unknown Token'),
                image: imageUrl
              }
            };
          })
        );

        // Group NFTs by contract to avoid duplicate price fetches
        const nftGroups = nonfungibleData.data.ownedNfts.reduce((acc: { [key: string]: any[] }, nft: any) => {
          if (!spamAddresses.includes(nft.contract.address.toLowerCase())) {
            if (!acc[nft.contract.address]) {
              acc[nft.contract.address] = [];
            }
            acc[nft.contract.address].push(nft);
          }
          return acc;
        }, {});

        // Fetch price data for each unique contract
        const priceData = await Promise.all(
          Object.keys(nftGroups).map(async (contractAddress) => {
            const [floorData, salesData] = await Promise.all([
              getPriceFloor(contractAddress),
              getSalesData(contractAddress)
            ]);
            return { 
              contractAddress, 
              floorPrice: floorData.floorPrice,
              floorPriceUsd: floorData.floorPriceUsd,
              averagePrice: salesData.averagePrice,
              averagePriceUsd: salesData.averagePriceUsd
            };
          })
        );

        // Create a map of contract addresses to price data
        const priceDataMap = priceData.reduce((acc: { [key: string]: any }, { contractAddress, ...data }) => {
          acc[contractAddress.toLowerCase()] = data;
          return acc;
        }, {});

        // Transform non-fungible tokens (ERC721 + ERC1155)
        const nftTokens = Object.values(nftGroups).flat().map((nft: any) => {
          const priceData = priceDataMap[nft.contract.address.toLowerCase()] || {};
          const balance = parseInt(nft.balance || '1'); // ERC721 always has balance 1
          
          // Use average price if available, otherwise fall back to floor price
          const totalValue = priceData.averagePriceUsd 
            ? priceData.averagePriceUsd * balance 
            : priceData.floorPriceUsd 
              ? priceData.floorPriceUsd * balance 
              : null;

          return {
            type: nft.tokenType.toLowerCase() as 'erc721' | 'erc1155',
            address: nft.contract.address,
            contractAddress: nft.contract.address,
            symbol: nft.contract.symbol || nft.contract.name,
            name: nft.name,
            balance: nft.balance,
            decimals: 0,
            tokenId: nft.tokenId,
            tokenType: nft.tokenType,
            contract: {
              address: nft.contract.address,
              name: nft.contract.name,
              symbol: nft.contract.symbol,
              tokenType: nft.tokenType
            },
            description: nft.description,
            tokenUri: nft.tokenUri,
            value: {
              usd: totalValue,
              floorPrice: priceData.floorPrice,
              floorPriceUsd: priceData.floorPriceUsd,
              averagePrice: priceData.averagePrice,
              averagePriceUsd: priceData.averagePriceUsd
            },
            nftMetadata: {
              name: nft.name,
              description: nft.description,
              image: {
                cachedUrl: nft.image.cachedUrl,
                thumbnailUrl: nft.image.thumbnailUrl,
                contentType: nft.image.contentType,
                originalUrl: nft.image.originalUrl
              },
              ...(nft.animation && {
                animation: {
                  cachedUrl: nft.animation.cachedUrl,
                  contentType: nft.animation.contentType
                }
              }),
              ...(nft.raw?.metadata?.content && {
                content: {
                  uri: nft.raw.metadata.content.uri,
                  mime: nft.raw.metadata.content.mime
                }
              })
            },
            metadata: {
              name: nft.name,
              image: nft.image.cachedUrl || nft.image.originalUrl
            }
          };
        });

        // Combine and filter out null values
        const allTokens = [...fungibleTokens, ...nftTokens].filter(Boolean);
        console.log('Final token count:', allTokens.length);
        setTokens(allTokens);
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