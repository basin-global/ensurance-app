import { PortfolioToken, NFTToken, ERC20Token } from '../types';
import Image from 'next/image';
import { formatUnits } from 'viem';

interface CardProps {
  token: PortfolioToken;
  variant: 'grid' | 'list';
}

export default function Card({ token, variant }: CardProps) {
  const imageSize = variant === 'grid' ? 40 : 32;
  const fallbackSize = variant === 'grid' ? 'text-2xl' : 'text-xl';

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

  const getTokenImage = (token: PortfolioToken): string | undefined => {
    if (token.type === 'native') {
      return token.metadata?.image || 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg';
    }
    if (token.type === 'erc721' || token.type === 'erc1155') {
      const nftToken = token as NFTToken;
      return nftToken.nftMetadata.image.cachedUrl || nftToken.nftMetadata.image.originalUrl;
    }
    if (token.type === 'erc20') {
      return (token as ERC20Token).metadata?.image;
    }
    return undefined;
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

  if (variant === 'grid') {
    return (
      <div className="flex flex-col gap-4">
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
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={fallbackSize + " font-bold text-gray-600"}>
                {getTokenName(token).charAt(0)}
              </div>
            </div>
          )}
        </div>
        <div className="text-lg font-semibold text-white text-center">
          {getTokenName(token)}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400 px-2">
          <div className="flex gap-4">
            <div>bal: {formatBalance(token)}</div>
            {token.value && <div>{formatUsdValue(token.value?.usd)}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-gray-900/30 transition-colors">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <div className={getImageContainerClasses(token, 'list')}>
            {getTokenImage(token) ? (
              <Image
                src={getTokenImage(token)!}
                alt={getTokenName(token)}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className={fallbackSize + " font-bold text-gray-600"}>
                {getTokenName(token).charAt(0)}
              </div>
            )}
          </div>
          <div className="font-medium text-white">
            {getTokenName(token)}
          </div>
        </div>
      </td>
      <td className="py-4 pr-4">
        <div className="font-medium text-white">
          {formatBalance(token)}
        </div>
      </td>
      <td className="py-4 text-right">
        <div className="font-medium text-white">
          {token.value && formatUsdValue(token.value?.usd)}
        </div>
      </td>
    </tr>
  );
} 