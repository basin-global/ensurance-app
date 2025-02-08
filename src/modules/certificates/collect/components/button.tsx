import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useEnsure } from '../../hooks/useEnsure';
import { type TokenDetails, type EnsuranceChain } from '../client';

interface EnsureButtonProps {
  chain: EnsuranceChain;
  tokenId: string;
  quantity: number;
  tokenDetails: TokenDetails;
  className?: string;
  onEnsure: (quantity: number) => Promise<void>;
}

export function EnsureButton({ 
  chain, 
  tokenId, 
  quantity,
  tokenDetails,
  className,
  onEnsure
}: EnsureButtonProps) {
  const { isEnsuring, ensureCertificate } = useEnsure();

  const handleClick = async () => {
    await onEnsure(quantity);
  };

  return (
    <Button 
      onClick={handleClick}
      disabled={isEnsuring || tokenDetails.saleStatus !== 'active'}
      className={`w-full px-6 py-3 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 ${className || ''}`}
    >
      <Plus className="h-6 w-6 mr-2" />
      {isEnsuring ? 'ENSURING...' : 
       tokenDetails.saleStatus === 'active' ? 'ENSURE' :
       tokenDetails.saleStatus === 'ended' ? 'SALE ENDED' :
       'SALE NOT STARTED'}
    </Button>
  );
}
