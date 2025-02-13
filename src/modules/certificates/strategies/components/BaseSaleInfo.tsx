import { BaseSaleDisplayProps, DisplayVariant } from '../types';

// Shared helper functions
const formatDate = (timestamp: number | string | undefined) => {
  if (!timestamp || timestamp === '0' || Number(timestamp) === 0) return 'Not Set';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
};

// Format address for display
const formatAddress = (address: string) => {
  if (!address || address === '0x0000000000000000000000000000000000000000') return 'Not Set';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const BaseSaleInfo = ({ 
  saleStart,
  saleEnd,
  maxTokensPerAddress,
  fundsRecipient,
  variant = 'full',
  showDebug = false 
}: BaseSaleDisplayProps) => {
  const now = Math.floor(Date.now() / 1000);
  const isActive = now >= saleStart && (saleEnd === 0 || now <= saleEnd);
  
  // Minimal variant (for cards)
  if (variant === 'minimal') {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span>{isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Limit:</span>
          <span>{maxTokensPerAddress || 'Unlimited'}</span>
        </div>
      </div>
    );
  }

  // Card variant (for grid views)
  if (variant === 'card') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-400">Sale Start</p>
            <p className="font-mono">{formatDate(saleStart)}</p>
          </div>
          <div>
            <p className="text-gray-400">Sale End</p>
            <p className="font-mono">{formatDate(saleEnd)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Full variant (default, for detail views)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400">Sale Start</p>
          <p className="font-mono">{formatDate(saleStart)}</p>
        </div>
        <div>
          <p className="text-gray-400">Sale End</p>
          <p className="font-mono">{formatDate(saleEnd)}</p>
        </div>
        <div>
          <p className="text-gray-400">Max Per Address</p>
          <p className="font-mono">{maxTokensPerAddress || 'Unlimited'}</p>
        </div>
        <div>
          <p className="text-gray-400">Funds Recipient</p>
          <p className="font-mono">{formatAddress(fundsRecipient)}</p>
        </div>
      </div>

      {showDebug && (
        <details className="text-xs mt-4">
          <summary className="cursor-pointer text-gray-400">Base Sale Info</summary>
          <pre className="mt-2 p-2 bg-black rounded overflow-auto">
            {JSON.stringify({
              saleStart,
              saleEnd,
              maxTokensPerAddress,
              fundsRecipient,
              isActive
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}; 