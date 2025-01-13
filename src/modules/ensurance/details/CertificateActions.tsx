import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { SplitsBar } from '@/modules/splits/components/SplitsBar';
import { getBasePath } from '@/config/routes';
import { useSite } from '@/contexts/site-context';
import { Asset, EnsureOperation } from '@/types';

interface CertificateActionsProps {
  asset: Asset;
  ensuranceData?: {
    creator_reward_recipient: string;
    creator_reward_recipient_split?: {
      recipients: Array<{
        percentAllocation: number;
        recipient: {
          address: string;
          ens?: string;
        }
      }>
    };
  };
  onEnsureClick: (operation: EnsureOperation) => void;
  chain: string;
}

export function CertificateActions({ 
  asset,
  ensuranceData,
  onEnsureClick,
  chain
}: CertificateActionsProps) {
  const site = useSite();

  return (
    <div className="flex flex-col gap-4">
      <Button 
        onClick={() => onEnsureClick('ensure')}
        className="w-full px-6 py-3 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600"
      >
        <Plus className="h-6 w-6 mr-2" />
        ENSURE
      </Button>

      {ensuranceData?.creator_reward_recipient_split && (
        <a 
          href={getBasePath(site) + `/flow/${chain}/${ensuranceData.creator_reward_recipient}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 bg-background dark:bg-background-dark rounded-xl hover:bg-gray-900 transition-colors duration-200"
        >
          <SplitsBar 
            recipients={ensuranceData.creator_reward_recipient_split.recipients} 
          />
        </a>
      )}
    </div>
  );
} 