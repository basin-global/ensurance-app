import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { Send, RefreshCw, DollarSign, ArrowLeftRight, Trash2, EyeOff, MoreVertical } from 'lucide-react'
import { Asset, EnsureOperation } from '@/types'
import { isEnsuranceToken } from '@/modules/ensurance/config'

interface EnsureMenuProps {
  isTokenbound: boolean;
  onOperationSelect: (operation: EnsureOperation) => void;
  asset: {
    chain: string;
    contract_address: string;
    isNative?: boolean;
  };
  isCurrency?: boolean;
}

export function EnsureMenuItems({ isTokenbound, onOperationSelect, asset, isCurrency = false }: EnsureMenuProps) {
  const isEnsuranceAsset = !isCurrency && isEnsuranceToken(asset.chain, asset.contract_address);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-1">
      <DropdownMenuItem 
        onClick={() => onOperationSelect('send')} 
        className="flex items-center gap-2 text-gray-100 hover:bg-gray-800 rounded-md"
      >
        <Send className="h-4 w-4" />
        <span>SEND</span>
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => onOperationSelect('buy')} 
        className="flex items-center gap-2 text-gray-100 hover:bg-gray-800 rounded-md"
      >
        <DollarSign className="h-4 w-4" />
        <span>BUY</span>
      </DropdownMenuItem>
      {!isCurrency && (
        <DropdownMenuItem 
          onClick={() => onOperationSelect('sell')} 
          className="flex items-center gap-2 text-gray-100 hover:bg-gray-800 rounded-md"
        >
          <DollarSign className="h-4 w-4" />
          <span>SELL</span>
        </DropdownMenuItem>
      )}
      {isCurrency && (
        <DropdownMenuItem 
          onClick={() => onOperationSelect('swap')} 
          className="flex items-center gap-2 text-gray-100 hover:bg-gray-800 rounded-md"
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>SWAP</span>
        </DropdownMenuItem>
      )}
      {isEnsuranceAsset && (
        <DropdownMenuItem 
          onClick={() => onOperationSelect('convert')} 
          className="flex items-center gap-2 text-gray-100 hover:bg-gray-800 rounded-md"
        >
          <RefreshCw className="h-4 w-4" />
          <span>CONVERT</span>
        </DropdownMenuItem>
      )}
      <div className="mx-2 my-1 border-t border-gray-800" />
      <DropdownMenuItem 
        onClick={() => onOperationSelect('hide')} 
        className="flex items-center gap-2 text-gray-500 hover:text-yellow-400 hover:bg-gray-800/50 rounded-md opacity-75"
      >
        <EyeOff className="h-4 w-4" />
        <span className="text-sm">HIDE</span>
      </DropdownMenuItem>
      {!isCurrency && (
        <DropdownMenuItem 
          onClick={() => onOperationSelect('burn')} 
          className="flex items-center gap-2 text-gray-500 hover:text-red-400 hover:bg-gray-800/50 rounded-md opacity-75"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm">BURN</span>
        </DropdownMenuItem>
      )}
    </div>
  );
}

export function EnsureMenu(props: EnsureMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-gray-800 rounded-full">
          <MoreVertical className="h-5 w-5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <EnsureMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 