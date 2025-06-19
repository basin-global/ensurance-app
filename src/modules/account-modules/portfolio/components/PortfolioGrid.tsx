import { PortfolioToken, NFTToken } from '../types';
import Card from './Card';
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { identifyEnsurancePortfolioTokens } from '@/lib/ensurance';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { EnsureButtonsLite } from '@/modules/ensure/buttons';
import { getTokenInfo } from '@/modules/specific/collect';

import { CONTRACTS } from '@/modules/specific/config';

interface PortfolioGridProps {
  tokens: PortfolioToken[];
  isLoading?: boolean;
  address: string;
  context: 'tokenbound' | 'operator';

  isOwner?: boolean;
  isDeployed?: boolean;
}

export default function PortfolioGrid({ 
  tokens, 
  isLoading = false, 
  address, 
  context,
 
  isOwner = false,
  isDeployed = false 
}: PortfolioGridProps) {
  const [processedTokens, setProcessedTokens] = useState<PortfolioToken[]>(tokens);
  const [tokenPrices, setTokenPrices] = useState<Record<string, bigint>>({});
  const [enhancedImages, setEnhancedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const processTokens = async () => {
      const tokensWithEnsurance = await identifyEnsurancePortfolioTokens(tokens);
      setProcessedTokens(tokensWithEnsurance);
      
      // Fetch prices for our specific ERC1155 tokens
      const pricePromises = tokensWithEnsurance
        .filter(token => 
          token.type === 'erc1155' && 
          token.ensurance?.isEnsuranceSpecific
        )
        .map(async (token) => {
          try {
            const nftToken = token as NFTToken;
            const tokenInfo = await getTokenInfo(
              token.address as `0x${string}`,
              nftToken.tokenId
            );
            
            if (tokenInfo?.salesConfig?.pricePerToken) {
              return {
                key: `${token.address}-${nftToken.tokenId}`,
                price: tokenInfo.salesConfig.pricePerToken
              };
            }
          } catch (error) {
            console.error('Failed to fetch token price:', error);
          }
          return null;
        });
      
      const prices = await Promise.all(pricePromises);
      const priceMap: Record<string, bigint> = {};
      
      prices.forEach(priceData => {
        if (priceData) {
          priceMap[priceData.key] = priceData.price;
        }
      });
      
      setTokenPrices(priceMap);
      
      // Fetch enhanced images for tokens that need it
      const imagePromises = tokensWithEnsurance
        .filter(token => {
          // ERC20 tokens without existing image
          const needsERC20Image = token.type === 'erc20' && 
            !(token as any).metadata?.image;
          
          // ERC721 group tokens (have yellow dot but no good image)
          const needsERC721Image = token.type === 'erc721' && 
            token.ensurance?.isEnsuranceGroup;
          
          return needsERC20Image || needsERC721Image;
        })
        .map(async (token) => {
          try {
            const params = new URLSearchParams({
              address: token.address,
              tokenType: token.type
            });
            
            // Add tokenId for ERC721 tokens
            if (token.type === 'erc721') {
              const nftToken = token as NFTToken;
              params.append('tokenId', nftToken.tokenId);
            }
            
            const response = await fetch(`/api/utilities/image?${params}`);
            const data = await response.json();
            
            if (data.url) {
              const key = token.type === 'erc721' ? 
                `${token.address}-${(token as NFTToken).tokenId}` : 
                token.address;
              return { key, url: data.url };
            }
          } catch (error) {
            console.error('Failed to fetch enhanced image:', error);
          }
          return null;
        });
      
      const images = await Promise.all(imagePromises);
      const imageMap: Record<string, string> = {};
      
      images.forEach(imageData => {
        if (imageData) {
          imageMap[imageData.key] = imageData.url;
        }
      });
      
      setEnhancedImages(imageMap);
    };
    processTokens();
  }, [tokens]);
  
  // Helper functions
  const shouldMuteButtons = (token: PortfolioToken) => {
    // All ERC721 tokens should be muted
    if (token.type === 'erc721') {
      return true;
    }
    
    // ERC1155 tokens that are NOT our specific contract should be muted
    if (token.type === 'erc1155' && !token.ensurance?.isEnsuranceSpecific) {
      return true;
    }
    
    return false;
  };
  
  const getTokenPrice = (token: PortfolioToken) => {
    if (token.type === 'erc1155' && token.ensurance?.isEnsuranceSpecific) {
      const nftToken = token as NFTToken;
      return tokenPrices[`${token.address}-${nftToken.tokenId}`];
    }
    return undefined;
  };
  
  const getEnhancedImageUrl = (token: PortfolioToken) => {
    const key = token.type === 'erc721' ? 
      `${token.address}-${(token as NFTToken).tokenId}` : 
      token.address;
    return enhancedImages[key];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {[...Array(4)].map((_, index) => (
          <UICard key={`skeleton-${index}`} className="bg-primary-dark border-gray-800">
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-gray-800" />
            </CardContent>
          </UICard>
        ))}
      </div>
    );
  }

  if (!processedTokens.length) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No matches found in this portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {processedTokens.map((token) => (
        <UICard 
          key={`${token.address}-${token.type}${token.type === 'erc721' || token.type === 'erc1155' ? `-${token.tokenId}` : ''}`}
          className="bg-primary-dark border-gray-800 hover:border-gray-700 transition-colors relative group"
        >
          {(token.ensurance?.isEnsuranceGeneral || token.ensurance?.isEnsuranceSpecific || token.ensurance?.isEnsuranceGroup) && (
            <div className="absolute top-2 right-2 z-10">
              <span className={cn(
                "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse",
                "bg-yellow-500 after:bg-yellow-500/50"
              )} />
            </div>
          )}
          <CardContent className="p-4">
            <Card 
              token={token}
              variant="grid"
              address={address}
              context={context}
              isOwner={isOwner}
              isDeployed={isDeployed}
              enhancedImageUrl={getEnhancedImageUrl(token)}
            />
            
            {/* Ensure Buttons - only show on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-center mt-2">
              <EnsureButtonsLite
                tokenSymbol={token.symbol}
                tokenName={token.name}
                imageUrl={token.type === 'erc721' || token.type === 'erc1155' ? 
                  (token as any).nftMetadata?.image?.cachedUrl || (token as any).metadata?.image : 
                  token.metadata?.image
                }
                contractAddress={token.type === 'native' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : token.address}
                tokenId={(token.type === 'erc721' || token.type === 'erc1155') ? (token as any).tokenId : undefined}
                tokenType={token.type as any}
                context={context}
                tbaAddress={context === 'tokenbound' ? address : undefined}
                variant="grid"
                showBuy={true}
                showSwap={true}
                showSend={true}
                showBurn={true}
                muted={shouldMuteButtons(token)}
                mutedTooltip="Portfolio actions not supported for this contract"
                pricePerToken={getTokenPrice(token)}
                primaryMintActive={!!getTokenPrice(token)}
              />
            </div>
          </CardContent>
        </UICard>
      ))}
    </div>
  );
} 