interface AccountStatsProps {
    total_currency_value: number;
    total_assets: number;
    ensured_assets: number;
}

export default function AccountStats({ 
    total_currency_value,
    total_assets,
    ensured_assets 
}: AccountStatsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Currency Stats */}
            <div className="bg-gray-900/30 rounded-lg p-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Currency</div>
                <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 tabular-nums">
                    ${Math.round(total_currency_value).toLocaleString()}
                </span>
            </div>

            {/* Asset Stats */}
            <div className="bg-gray-900/30 rounded-lg p-2">
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
            </div>
        </div>
    );
} 