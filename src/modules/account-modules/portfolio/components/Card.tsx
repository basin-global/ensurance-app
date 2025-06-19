import { PortfolioToken, NFTToken, ERC20Token } from '../types';
import Image from 'next/image';
import { formatUnits } from 'viem';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnsureButtonsLite } from '@/modules/ensure/buttons';
import { useState, useEffect } from 'react';
import { getTokenInfo } from '@/modules/specific/collect';

import { CONTRACTS } from '@/modules/specific/config';

interface CardProps {
  token: PortfolioToken;
  variant: 'list' | 'grid' | 'overview';
  address: string;
  context: 'tokenbound' | 'operator';
  isOverview?: boolean;
  isOwner?: boolean;
  isDeployed?: boolean;
  enhancedImageUrl?: string;
}

export default function Card({ 
  token, 
  variant, 
  address, 
  context,
  isOverview = false,
  isOwner = false,
  isDeployed = false,
  enhancedImageUrl
}: CardProps) {
  const imageSize = variant === 'grid' ? 40 : 32;
  const fallbackSize = variant === 'grid' ? 'text-2xl' : 'text-xl';
  
  // State for specific ERC1155 pricing
  const [pricePerToken, setPricePerToken] = useState<bigint | undefined>();
  
  // Check if this is our specific contract
  const isOurSpecificContract = token.ensurance?.isEnsuranceSpecific;
  
  // Determine if buttons should be muted
  const shouldMuteButtons = () => {
    // All ERC721 tokens should be muted
    if (token.type === 'erc721') {
      return true;
    }
    
    // ERC1155 tokens that are NOT our specific contract should be muted
    if (token.type === 'erc1155' && !isOurSpecificContract) {
      return true;
    }
    
    // For tokenbound context, check ownership and deployment
    if (context === 'tokenbound') {
      // If not owner, mute buttons
      if (!isOwner) {
        return true;
      }
      
      // If owner but not deployed, mute buttons
      if (isOwner && !isDeployed) {
        return true;
      }
    }
    
    return false;
  };
  
  // Get appropriate tooltip message based on state
  const getMutedTooltip = () => {
    // Handle token type restrictions first
    if (token.type === 'erc721') {
      return "portfolio actions not supported for this contract";
    }
    
    if (token.type === 'erc1155' && !isOurSpecificContract) {
      return "portfolio actions not supported for this contract";
    }
    
    // Handle tokenbound authentication
    if (context === 'tokenbound') {
      if (!isOwner) {
        return "connect as account operator to enable actions";
      }
      
      if (isOwner && !isDeployed) {
        return "deploy account to enable portfolio actions";
      }
    }
    
    return "portfolio actions not supported for this contract";
  };
  
  // Fetch price for our specific ERC1155 tokens
  useEffect(() => {
    const fetchPrice = async () => {
      if (token.type === 'erc1155' && isOurSpecificContract && token.address) {
        try {
          const nftToken = token as NFTToken;
          const tokenInfo = await getTokenInfo(
            token.address as `0x${string}`,
            nftToken.tokenId
          );
          
          if (tokenInfo?.salesConfig?.pricePerToken) {
            setPricePerToken(tokenInfo.salesConfig.pricePerToken);
          }
        } catch (error) {
          console.error('Failed to fetch token price:', error);
        }
      }
    };
    
    fetchPrice();
  }, [token.type, token.address, isOurSpecificContract]);
  


  const formatBalance = (token: PortfolioToken) => {
    if (token.type === 'erc721') {
      return '1'; // ERC721s always have balance of 1
    }
    
    if (token.type === 'erc1155') {
      return token.balance; // ERC1155s show actual balance
    }
    
    // For fungible tokens, use existing logic
    const formatted = formatUnits(BigInt(token.balance), token.decimals);
    const value = parseFloat(formatted);
    
    // For values >= 1, show full number with commas, no decimals
    if (value >= 1) {
      return Math.floor(value).toLocaleString('en-US');
    }
    
    // For small values, show more decimals to capture small amounts
    return value.toLocaleString('en-US', { 
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 6
    });
  };

  const formatUsdValue = (value: number | null) => {
    if (!value) return '-';
    
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatEthValue = (value: number | null) => {
    if (!value) return '-';
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }) + ' ETH';
  };


  
  const getTokenImage = (token: PortfolioToken): string | undefined => {
    // Return enhanced image URL if available
    if (enhancedImageUrl) {
      return enhancedImageUrl;
    }
    
    if (token.type === 'native') {
      return token.metadata?.image || 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg';
    }
    if (token.type === 'erc721' || token.type === 'erc1155') {
      const nftToken = token as NFTToken;
      const imageUrl = nftToken.nftMetadata.image.cachedUrl || nftToken.nftMetadata.image.originalUrl;
      
      // Validate image URL to filter out suspicious domains
      if (imageUrl && isValidImageUrl(imageUrl)) {
        return imageUrl;
      }
      return undefined; // Will fall back to enhanced fetching or placeholder
    }
    if (token.type === 'erc20') {
      return (token as ERC20Token).metadata?.image;
    }
    return undefined;
  };

  // Helper function to validate image URLs
  const isValidImageUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      
      // List of suspicious or untrusted domains to block
      const blockedDomains = [
        'nftcreator.pages.dev',
        // Add other suspicious domains as needed
      ];
      
      // Check if domain is in blocked list
      if (blockedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
        console.warn(`Blocked suspicious image domain: ${parsedUrl.hostname}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Invalid image URL:', url);
      return false;
    }
  };

  const getTokenName = (token: PortfolioToken) => {
    if (token.type === 'erc721' || token.type === 'erc1155') {
      return token.name || token.symbol;
    }
    return token.symbol;
  };

  const getImageContainerClasses = (token: PortfolioToken, variant: 'grid' | 'list') => {
    if (token.type === 'erc20' || token.type === 'native') {
      return variant === 'grid' 
        ? "relative w-full aspect-square rounded-full overflow-hidden bg-black/20"
        : "w-8 h-8 bg-gray-800 rounded-full overflow-hidden flex items-center justify-center";
    }
    return variant === 'grid'
      ? "relative w-full aspect-square rounded-lg overflow-hidden bg-black/20"
      : "w-8 h-8 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center";
  };

  const EnsuranceDot = () => (
    <span className={cn(
      "w-2 h-2 rounded-full relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:animate-pulse",
      "bg-yellow-500 after:bg-yellow-500/50"
    )} />
  );

  const getTokenLink = (token: PortfolioToken) => {
    // Don't create links in overview mode
    if (variant === 'overview') return '#';

    // Handle Ensurance tokens
    if (token.ensurance?.isEnsuranceGeneral) {
      return `/general/${token.address}`;
    }
    if (token.ensurance?.isEnsuranceSpecific && (token.type === 'erc721' || token.type === 'erc1155')) {
      const nftToken = token as NFTToken;
      return `/specific/${token.address}/${nftToken.tokenId}`;
    }
    // Handle account tokens (NFTs that are part of a group)
    if (token.ensurance?.isEnsuranceGroup && (token.type === 'erc721' || token.type === 'erc1155')) {
      const nftToken = token as NFTToken;
      return `/${nftToken.name}`;
    }
    return '#';
  };

  const showEnsuranceDot = variant !== 'overview' && 
    (token.ensurance?.isEnsuranceGeneral || token.ensurance?.isEnsuranceSpecific || token.ensurance?.isEnsuranceGroup);

  const getValueTooltip = (token: PortfolioToken) => {
    if (token.type === 'erc721' || token.type === 'erc1155') {
      const nftToken = token as NFTToken;
      const averagePrice = nftToken.value?.averagePrice;
      const averagePriceUsd = nftToken.value?.averagePriceUsd;
      const floorPrice = nftToken.value?.floorPrice;
      const floorPriceUsd = nftToken.value?.floorPriceUsd;
      
      let tooltipContent = [];
      
      // Always show average sale price, even if null
      tooltipContent.push(
        `Average Sale: ${averagePrice ? formatEthValue(averagePrice) : 'N/A'} (${averagePriceUsd ? formatUsdValue(averagePriceUsd) : 'N/A'})`
      );
      
      // Always show floor price, even if null
      tooltipContent.push(
        `Floor Price: ${floorPrice ? formatEthValue(floorPrice) : 'N/A'} (${floorPriceUsd ? formatUsdValue(floorPriceUsd) : 'N/A'})`
      );
      
      return tooltipContent.join('\n');
    }
    return undefined;
  };

  const getDisplayValue = (token: PortfolioToken) => {
    if (token.type === 'erc721' || token.type === 'erc1155') {
      const nftToken = token as NFTToken;
      const quantity = parseInt(token.balance);
      
      // Try to use average sale price first
      if (nftToken.value?.averagePrice && nftToken.value?.averagePriceUsd) {
        return {
          eth: nftToken.value.averagePrice * quantity,
          usd: nftToken.value.averagePriceUsd * quantity,
          isFloorPrice: false
        };
      }
      
      // Fall back to floor price
      if (nftToken.value?.floorPrice && nftToken.value?.floorPriceUsd) {
        return {
          eth: nftToken.value.floorPrice * quantity,
          usd: nftToken.value.floorPriceUsd * quantity,
          isFloorPrice: true
        };
      }
    }
    
    // For other token types, use existing value
    return token.value ? {
      eth: null,
      usd: token.value.usd,
      isFloorPrice: false
    } : null;
  };

  const displayValue = getDisplayValue(token);

  if (variant === 'grid') {
    return (
      <div className="flex flex-col gap-4">
        <Link 
          href={getTokenLink(token)}
          className={cn(
            "block cursor-pointer",
            getTokenLink(token) === '#' && "cursor-default"
          )}
        >
          <div className={getImageContainerClasses(token, 'grid')}>
            {getTokenImage(token) ? (
              <Image
                src={getTokenImage(token)!}
                alt={getTokenName(token)}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={false}
                loading="lazy"
                className="object-cover"
                unoptimized={true}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = '/assets/no-image-found.png';
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={fallbackSize + " font-bold text-gray-600"}>
                  {getTokenName(token).charAt(0)}
                </div>
              </div>
            )}
          </div>
        </Link>
        <div className="flex items-center justify-center gap-2">
          <div className="text-lg font-semibold text-white">
            {getTokenName(token)}
          </div>
          {showEnsuranceDot && <EnsuranceDot />}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400 px-2">
          <div className="flex gap-4">
            <div>bal: {formatBalance(token)}</div>
            {displayValue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1",
                      displayValue.isFloorPrice && "text-gray-500"
                    )}>
                      {formatUsdValue(displayValue.usd)}
                      {displayValue.isFloorPrice && (
                        <span className="text-xs text-gray-500">*</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="whitespace-pre-line">
                      {getValueTooltip(token)}
                      {displayValue.isFloorPrice && "\n\n* Low market activity - using floor price"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-gray-900/30 transition-colors group">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <Link 
            href={getTokenLink(token)}
            className={cn(
              "block cursor-pointer",
              getTokenLink(token) === '#' && "cursor-default"
            )}
          >
            <div className={getImageContainerClasses(token, 'list')}>
              {getTokenImage(token) ? (
                <Image
                  src={getTokenImage(token)!}
                  alt={getTokenName(token)}
                  width={imageSize}
                  height={imageSize}
                  className="object-cover"
                />
              ) : (
                <div className={fallbackSize + " font-bold text-gray-600"}>
                  {getTokenName(token).charAt(0)}
                </div>
              )}
            </div>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="font-medium text-white">
                {getTokenName(token)}
              </div>
              {showEnsuranceDot && <EnsuranceDot />}
            </div>
            <div className="text-sm text-gray-400">
              bal: {formatBalance(token)}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 text-right">
        {displayValue && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center justify-end gap-1",
                  displayValue.isFloorPrice && "text-gray-500"
                )}>
                  {formatUsdValue(displayValue.usd)}
                  {displayValue.isFloorPrice && (
                    <span className="text-xs text-gray-500">*</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="whitespace-pre-line">
                  {getValueTooltip(token)}
                  {displayValue.isFloorPrice && "\n\n* Low market activity - using floor price"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </td>
      <td className="py-4 text-right">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <EnsureButtonsLite
            tokenSymbol={token.symbol}
            tokenName={token.name}
            imageUrl={getTokenImage(token)}
            contractAddress={token.type === 'native' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : token.address}
            tokenId={(token.type === 'erc721' || token.type === 'erc1155') ? (token as NFTToken).tokenId : undefined}
            tokenType={token.type as any}
            context={context}
            tbaAddress={context === 'tokenbound' ? address : undefined}
            variant="list"
            showBuy={true}
            showSwap={true}
            showSend={true}
            showBurn={true}
            muted={shouldMuteButtons()}
            mutedTooltip={getMutedTooltip()}
            pricePerToken={pricePerToken}
            primaryMintActive={!!pricePerToken}
          />
        </div>
      </td>
    </tr>
  );
}