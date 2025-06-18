import { PortfolioToken, NFTToken } from '../types';
import Card from './Card';
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { identifyEnsurancePortfolioTokens } from '@/lib/ensurance';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { EnsureButtons } from '@/modules/ensure/buttons';

interface PortfolioGridProps {
  tokens: PortfolioToken[];
  isLoading?: boolean;
  tbaAddress: string;
  showEnsureButtons?: boolean;
  isOwner?: boolean;
  isDeployed?: boolean;
}

export default function PortfolioGrid({ 
  tokens, 
  isLoading = false, 
  tbaAddress, 
  showEnsureButtons = true, 
  isOwner = false,
  isDeployed = false 
}: PortfolioGridProps) {
  const [processedTokens, setProcessedTokens] = useState<PortfolioToken[]>(tokens);

  useEffect(() => {
    const processTokens = async () => {
      const tokensWithEnsurance = await identifyEnsurancePortfolioTokens(tokens);
      setProcessedTokens(tokensWithEnsurance);
    };
    processTokens();
  }, [tokens]);

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
              tbaAddress={tbaAddress}
              isOwner={isOwner}
              isDeployed={isDeployed}
            />
            {showEnsureButtons && (
              <div className="absolute bottom-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <EnsureButtons
                  contractAddress={token.address as `0x${string}`}
                  tokenId={token.type === 'erc721' || token.type === 'erc1155' ? (token as NFTToken).tokenId : ''}
                  tokenType={token.type}
                  tokenSymbol={token.symbol}
                  tokenName={token.name}
                  imageUrl={token.metadata?.image || '/assets/no-image-found.png'}
                  size="sm"
                  variant="grid"
                  context="tokenbound"
                  tbaAddress={tbaAddress as `0x${string}`}
                  isOwner={isOwner}
                  isDeployed={isDeployed}
                  showBalance={false}
                  showBurn={token.ensurance?.isEnsuranceGeneral || token.ensurance?.isEnsuranceSpecific || false}
                  initialBalance={token.balance}
                />
              </div>
            )}
          </CardContent>
        </UICard>
      ))}
    </div>
  );
} 