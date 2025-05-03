import { PortfolioToken } from '../types';
import Image from 'next/image';
import { formatUnits } from 'viem';

interface CardProps {
  token: PortfolioToken;
  variant: 'grid' | 'list';
}

export default function Card({ token, variant }: CardProps) {
  const imageSize = variant === 'grid' ? 40 : 32;
  const fallbackSize = variant === 'grid' ? 'text-2xl' : 'text-xl';

  const formatBalance = (balance: string, decimals: number) => {
    const formatted = formatUnits(BigInt(balance), decimals);
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

  if (variant === 'grid') {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20">
          {token.metadata?.image ? (
            <Image
              src={token.metadata.image}
              alt={token.symbol}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={false}
              loading="lazy"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl font-bold text-gray-600">
                {token.symbol.charAt(0)}
              </div>
            </div>
          )}
        </div>
        <div className="text-lg font-semibold text-white text-center">
          {token.symbol}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400 px-2">
          <div className="flex gap-4">
            <div>bal: {formatBalance(token.balance, token.decimals)}</div>
            <div>{formatUsdValue(token.value?.usd)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-gray-900/30 transition-colors">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 rounded-full overflow-hidden flex items-center justify-center">
            {token.metadata?.image ? (
              <Image
                src={token.metadata.image}
                alt={token.symbol}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="text-xl font-bold text-gray-600">
                {token.symbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="font-medium text-white">
            {token.symbol}
          </div>
        </div>
      </td>
      <td className="py-4 pr-4">
        <div className="font-medium text-white">
          {formatBalance(token.balance, token.decimals)}
        </div>
      </td>
      <td className="py-4 text-right">
        <div className="font-medium text-white">
          {formatUsdValue(token.value?.usd)}
        </div>
      </td>
    </tr>
  );
} 