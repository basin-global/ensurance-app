import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface TokenPriceDisplayProps {
  averagePrice?: number | null;
  averagePriceUsd?: number | null;
  floorPrice?: number | null;
  floorPriceUsd?: number | null;
  className?: string;
  configuredPrice?: number | null; // Add configured price for comparison
  alignDollarSign?: boolean; // New prop for columnar alignment
  dollarWidth?: string; // Optional width for $ column
  numberWidth?: string; // Optional width for number column
}

export function TokenPriceDisplay({
  averagePrice,
  averagePriceUsd,
  floorPrice,
  floorPriceUsd,
  className,
  configuredPrice,
  alignDollarSign = false,
  dollarWidth = '1.2em',
  numberWidth = '4em'
}: TokenPriceDisplayProps) {
  const formatUsdValue = (value: number | null) => {
    if (!value) return '-';
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    });
  };

  const formatEthValue = (value: number | null) => {
    if (!value) return '-';
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }) + ' ETH';
  };

  const getValueTooltip = () => {
    let tooltipContent = [];
    
    // Always show average sale price, even if null
    tooltipContent.push(
      `Average Sale: ${averagePrice ? formatEthValue(averagePrice) : 'N/A'} (${averagePriceUsd ? formatUsdValue(averagePriceUsd) : 'N/A'})`
    );
    
    // Always show floor price, even if null
    tooltipContent.push(
      `Floor Price: ${floorPrice ? formatEthValue(floorPrice) : 'N/A'} (${floorPriceUsd ? formatUsdValue(floorPriceUsd) : 'N/A'})`
    );

    // Add arbitrage info if we have both prices
    if (configuredPrice && averagePriceUsd) {
      const priceDiff = averagePriceUsd - configuredPrice;
      const percentDiff = (priceDiff / configuredPrice) * 100;
      tooltipContent.push(
        `\nArbitrage: ${priceDiff > 0 ? '+' : ''}${formatUsdValue(priceDiff)} (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`
      );
    }
    
    return tooltipContent.join('\n');
  };

  // Use average price if available, otherwise fall back to floor price
  const displayValue = averagePriceUsd || floorPriceUsd;

  if (!displayValue) return null;

  // Calculate price difference if we have both prices
  const hasArbitrage = configuredPrice && displayValue && displayValue > configuredPrice;
  const priceDiff = hasArbitrage ? displayValue - configuredPrice : 0;
  const percentDiff = hasArbitrage ? (priceDiff / configuredPrice) * 100 : 0;

  return (
    <div className={className}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {alignDollarSign ? (
              <div className={cn(
                "font-medium flex items-baseline tabular-nums gap-x-1",
                hasArbitrage && "text-green-400"
              )}>
                <span className="inline-block text-right" style={{ width: dollarWidth }}>$</span>
                <span className="inline-block text-right" style={{ width: numberWidth }}>{formatUsdValue(displayValue)}</span>
                {hasArbitrage && (
                  <span className="ml-1 text-xs text-green-400">(+{percentDiff.toFixed(1)}%)</span>
                )}
              </div>
            ) : (
              <div className={cn(
                "font-medium flex items-center gap-1",
                hasArbitrage && "text-green-400"
              )}>
                {formatUsdValue(displayValue)}
                {hasArbitrage && (
                  <span className="text-xs text-green-400">
                    (+{percentDiff.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p className="whitespace-pre-line">{getValueTooltip()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 