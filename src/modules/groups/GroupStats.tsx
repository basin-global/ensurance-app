interface GroupStatsProps {
    situs_account: string | null;
    tba_address: string | null;
}

export default function GroupStats({ 
    situs_account,
    tba_address 
}: GroupStatsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Situs Account */}
            <div className="bg-gray-900/30 rounded-lg p-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Situs Account</div>
                <span className="text-base font-mono bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
                    {situs_account || 'Not set'}
                </span>
            </div>

            {/* TBA Stats */}
            <div className="bg-gray-900/30 rounded-lg p-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">TBA</div>
                <div className="flex flex-col">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500">Address</span>
                        <span className="text-sm font-mono text-gray-300 truncate max-w-[180px]">
                            {tba_address || 'Not deployed'}
                        </span>
                    </div>
                    {tba_address && (
                        <div className="flex justify-end mt-1">
                            <a 
                                href={`https://basescan.org/address/${tba_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                View on Basescan
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 