import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AccountStatsProps {
    variant?: 'mini' | 'detailed' | 'full';
    total_currency_value: number;
    total_assets: number;
    ensured_assets: number;
    uniqueCount?: number;
    currencyCount?: number;
    chains?: string[];
    accountName?: string;  // For links in full variant
    loading?: boolean;
    className?: string;
}

export default function AccountStats({ 
    variant = 'mini',
    total_currency_value,
    total_assets,
    ensured_assets,
    uniqueCount,
    currencyCount,
    chains = [],
    accountName,
    loading = false,
    className
}: AccountStatsProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[100px]">
                <div className="animate-pulse text-gray-400">Loading stats...</div>
            </div>
        )
    }

    const StatWrapper = ({ children, href }: { children: React.ReactNode, href?: string }) => {
        if (href && variant === 'full') {
            return (
                <Link href={href} className="block h-full">
                    <div className="bg-gray-900/50 rounded-lg p-2 hover:bg-gray-900/70 transition-colors h-full">
                        {children}
                    </div>
                </Link>
            )
        }
        return (
            <div className={cn(
                "bg-gray-900/30 rounded-lg p-2",
                variant === 'full' && "bg-gray-900/50"
            )}>
                {children}
            </div>
        )
    }

    if (variant === 'mini') {
        return (
            <div className={cn("grid grid-cols-2 gap-3 mt-3", className)}>
                {/* Currency Stats */}
                <StatWrapper>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Currency</div>
                    <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                        ${Math.round(total_currency_value).toLocaleString()}
                    </span>
                </StatWrapper>

                {/* Asset Stats */}
                <StatWrapper>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assets</div>
                    <div className="flex flex-col">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Total</span>
                            <span className="text-base text-gray-300 tabular-nums">
                                {total_assets?.toLocaleString() || '0'}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Ensured</span>
                            <div className="flex flex-col items-end">
                                <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                                    {ensured_assets?.toLocaleString() || '0'}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                    {total_assets ? ((ensured_assets / total_assets) * 100).toFixed(1) : '0'}% of total
                                </span>
                            </div>
                        </div>
                    </div>
                </StatWrapper>
            </div>
        )
    }

    // Full variant with all stats and links
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-1", className)}>
            {/* Assets Stats */}
            <StatWrapper href={accountName ? `/${accountName}/hold` : undefined}>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assets</div>
                <div className="space-y-2.5">
                    {uniqueCount !== undefined && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Total Portfolio</span>
                            <span className="text-base text-gray-300 tabular-nums">
                                {uniqueCount.toLocaleString()} unique
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500">Total Assets</span>
                        <span className="text-base text-gray-300 tabular-nums">
                            {total_assets.toLocaleString()} items
                        </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500">Ensured Assets</span>
                        <div className="flex flex-col items-end">
                            <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                                {ensured_assets.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-600">
                                {((ensured_assets / (uniqueCount || total_assets)) * 100).toFixed(1)}% of {uniqueCount ? 'portfolio' : 'total'}
                            </span>
                        </div>
                    </div>
                </div>
            </StatWrapper>

            {/* Currency Stats */}
            <StatWrapper href={accountName ? `/${accountName}/hold?module=currency` : undefined}>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Currency</div>
                <div className="space-y-2.5">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500">Total Value</span>
                        <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                            ${Math.round(total_currency_value).toLocaleString()}
                        </span>
                    </div>
                    {currencyCount !== undefined && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Currencies</span>
                            <span className="text-base text-gray-300 tabular-nums">
                                {currencyCount}
                            </span>
                        </div>
                    )}
                    {chains && chains.length > 0 && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Chains</span>
                            <span className="text-base text-gray-300 tabular-nums">
                                {chains.length}
                            </span>
                        </div>
                    )}
                </div>
            </StatWrapper>
        </div>
    )
} 