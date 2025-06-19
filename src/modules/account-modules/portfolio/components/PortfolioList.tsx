import { PortfolioToken, NFTToken } from '../types';
import Card from './Card';
import { identifyEnsurancePortfolioTokens } from '@/lib/ensurance';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EnsureButtonsLite } from '@/modules/ensure/buttons';

interface PortfolioListProps {
  tokens: PortfolioToken[];
  isOverview?: boolean;
  address: string;
  context: 'tokenbound' | 'operator';
  account?: string;
  isOwner?: boolean;
  isDeployed?: boolean;
}

export default function PortfolioList({ 
  tokens, 
  isOverview = false, 
  address, 
  context,
  account, 
  isOwner = false,
  isDeployed = false 
}: PortfolioListProps) {
  const [processedTokens, setProcessedTokens] = useState<PortfolioToken[]>(tokens);
  const [enhancedImages, setEnhancedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const processTokens = async () => {
      const tokensWithEnsurance = await identifyEnsurancePortfolioTokens(tokens);
      setProcessedTokens(tokensWithEnsurance);
      
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

  // Helper function to get enhanced image URL
  const getEnhancedImageUrl = (token: PortfolioToken) => {
    const key = token.type === 'erc721' ? 
      `${token.address}-${(token as NFTToken).tokenId}` : 
      token.address;
    return enhancedImages[key];
  };

  if (!processedTokens.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">None found</p>
      </div>
    );
  }

  // If in overview mode, sort by USD value and limit to 10 items
  const displayTokens = isOverview 
    ? [...processedTokens]
        .sort((a, b) => {
          const aValue = a.value?.usd || 0;
          const bValue = b.value?.usd || 0;
          return bValue - aValue; // Sort descending
        })
        .slice(0, 10)
    : processedTokens;

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full">
        {!isOverview && (
          <thead>
            <tr className="text-left text-sm text-gray-400">
              <th className="pb-4 font-medium w-[50%]">name</th>
              <th className="pb-4 font-medium text-right w-[30%]">value</th>
              <th className="pb-4 font-medium text-right w-[20%]">actions</th>
            </tr>
          </thead>
        )}
        <tbody className={`divide-y divide-gray-800 ${isOverview ? 'space-y-2' : ''}`}>
          {displayTokens.map((token) => (
            <Card
              key={`${token.address}-${token.type}${token.type === 'erc721' || token.type === 'erc1155' ? `-${token.tokenId}` : ''}`}
              token={token}
              variant={isOverview ? 'overview' : 'list'}
              address={address}
              context={context}
              isOverview={isOverview}
              isOwner={isOwner}
              isDeployed={isDeployed}
              enhancedImageUrl={getEnhancedImageUrl(token)}
            />
          ))}
        </tbody>
      </table>
      {isOverview && account && (
        <Link href={`/${account}/hold`} className="absolute inset-0 z-10" tabIndex={-1} aria-label="View all assets">
          <span className="sr-only">View all assets</span>
        </Link>
      )}
    </div>
  );
} 