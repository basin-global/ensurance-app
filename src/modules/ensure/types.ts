import { Asset } from '@/types';

// Token standards
export type TokenStandard = 'ERC721' | 'ERC1155' | 'ERC20' | 'ERC4626' | 'Web2';

// Entity types
export type EntityType = 
  | 'group'        // ERC721 contract
  | 'account'      // ERC721 token (includes agents)
  | 'generalCert'  // ERC20 token
  | 'specificCert' // ERC1155 token
  | 'syndicate'    // ERC4626 vault
  | 'pool'         // Same contract ABI as accounts
  | 'property';    // Web2 data in DB

// Mapping entity types to token standards
export const entityToStandard: Record<EntityType, TokenStandard> = {
  group: 'ERC721',
  account: 'ERC721',
  generalCert: 'ERC20',
  specificCert: 'ERC1155',
  syndicate: 'ERC4626',
  pool: 'ERC721',
  property: 'Web2'
};

// View mode
export type ViewMode = 'grid' | 'list';

// Base item interface with common properties across all entity types
export interface BaseItem {
  id: string;           // Unique identifier
  type: EntityType;     // Type of entity
  name: string;         // Display name
  description?: string; // Description
  image?: string;       // Image URL
  url?: string;         // Detail page URL
  quantity?: number;    // Quantity (for ERC20/ERC1155)
  isOwned?: boolean;    // Whether the current user owns this item
  isEnsured?: boolean;  // Whether the item is ensured
  chain?: string;       // Blockchain chain (if applicable)
  tokenId?: string | number; // Token ID for NFTs
  groupName?: string;      // Group name
}

// Group-specific properties
export interface GroupItem extends BaseItem {
  type: 'group';
  contractAddress: string;
  groupName: string;
  tagline?: string;
  totalSupply: number;
  isActive: boolean;
}

// Account-specific properties
export interface AccountItem extends BaseItem {
  type: 'account';
  tokenId: number;
  groupName: string;
  tbaAddress?: string;
  isAgent: boolean;
  ownerAddress?: string;
}

// Certificate-specific properties (base for both general and specific)
export interface BaseCertificateItem extends BaseItem {
  contractAddress: string;
  tokenId: string;
  valueUsd?: number;
}

// General Certificate (ERC20)
export interface GeneralCertItem extends BaseCertificateItem {
  type: 'generalCert';
  symbol: string;
  decimals: number;
  balance?: string;
}

// Specific Certificate (ERC1155)
export interface SpecificCertItem extends BaseCertificateItem {
  type: 'specificCert';
  metadata?: Record<string, any>;
}

// Syndicate-specific properties
export interface SyndicateItem extends BaseItem {
  type: 'syndicate';
  targetYield: number;
  actualYield: number;
  deposits: number;
  currency: string;
  impact?: string;
  impactTags?: string[];
}

// Pool-specific properties
export interface PoolItem extends BaseItem {
  type: 'pool';
  tokenId: number;
  groupName: string;
  poolType: 'stock' | 'flow';
  totalCurrencyValue?: number;
  totalAssets?: number;
  ensuredAssets?: number;
}

// Property-specific properties
export interface PropertyItem extends BaseItem {
  type: 'property';
  location?: string;
  size?: number;
  sizeUnit?: string;
  propertyType?: string;
  attributes?: Record<string, any>;
}

// Union type of all item types
export type EnsureItem = 
  | GroupItem
  | AccountItem
  | GeneralCertItem
  | SpecificCertItem
  | SyndicateItem
  | PoolItem
  | PropertyItem;

// Configuration for the grid component
export interface EnsureGridConfig {
  viewModes?: ViewMode[];
  defaultViewMode?: ViewMode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  showSearch?: boolean;
  showViewToggle?: boolean;
  showAccounts?: boolean;
  emptyStateMessage?: string;
  loadingItems?: number;
  onItemClick?: (item: EnsureItem) => void;
}
