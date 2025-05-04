import { PortfolioToken } from '../types';
import Card from './Card';

interface PortfolioListProps {
  tokens: PortfolioToken[];
}

export default function PortfolioList({ tokens }: PortfolioListProps) {
  if (!tokens.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tokens found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400">
            <th className="pb-4 font-medium">name</th>
            <th className="pb-4 font-medium">balance</th>
            <th className="pb-4 font-medium text-right">value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {tokens.map((token) => (
            <Card
              key={`${token.address}-${token.type}${token.type === 'erc721' || token.type === 'erc1155' ? `-${token.tokenId}` : ''}`}
              token={token}
              variant="list"
            />
          ))}
        </tbody>
      </table>
    </div>
  );
} 