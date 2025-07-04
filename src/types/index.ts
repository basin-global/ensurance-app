// =============================================================================
// Situs Types
// This file defines TypeScript interfaces and types specific to the Situs project.
// These types are used throughout the application to ensure type safety and provide
// better developer experience with autocompletion and error checking.
// =============================================================================

// -----------------------------------------------------------------------------
// Group & Account Core Types
// -----------------------------------------------------------------------------
export interface Group {
    contract_address: string;
    group_name: string; // Expected to always start with a dot (e.g., ".example")
    name: string;    // Group Name
    email: string;   // Group Email
    name_front?: string;
    tagline?: string;
    description?: string;
    chat?: string;
    total_supply: number;
    website?: string;
    group_ensurance?: string | boolean;
}

export type GroupConfig = Group;

export interface GroupAccount {
    token_id: number;           // Primary key, NOT NULL
    account_name: string;       // NOT NULL
    full_account_name?: string; // Can be NULL
    tba_address?: string;       // Can be NULL
    is_agent: boolean;          // NOT NULL
    group_name: string;         // The group this account belongs to (with dot)
    description?: string;       // Can be NULL
    created_at?: string;        // Optional timestamp
    owner_of?: string;          // Optional owner address
    specific_asset_id?: number; // Optional specific asset ID
}

export interface GroupAccountsProps {
    group: string;
    accounts: GroupAccount[];
    searchQuery: string;
    hideGroupSuffix?: boolean;
    showCreateOption?: boolean;
    getAccountUrl?: (account: GroupAccount) => string;
}

// -----------------------------------------------------------------------------
// Asset Types
// -----------------------------------------------------------------------------
interface BaseAsset {
    chain: string;
    contract_address: string;
    token_id: string;
    queried_wallet_balances?: Array<{
        quantity_string: string;
        value_usd_string?: string;
        address?: string;
        first_acquired_date?: string;
        last_acquired_date?: string;
        quantity?: number;
    }>;
}

// -----------------------------------------------------------------------------
// Ensurance Asset Types
// -----------------------------------------------------------------------------

/**
 * These types identify if an asset is an Ensurance asset based on its contract.
 * This is different from the database-level isEnsurance check (in accounts.ts) which
 * is used to identify if a group is the ensurance group and include additional fields
 * like stock_or_flow and display_name in database queries.
 */
export interface EnsuranceFlags {
    isEnsuranceGeneral?: boolean;  // For ERC20 certificates from certificates.general
    isEnsuranceSpecific?: boolean; // For ERC1155 certificates from specific contract
    isEnsuranceGroup?: boolean;    // For ERC721 accounts from members.groups
}

export interface Asset extends BaseAsset {
    name?: string;
    image_url?: string;
    video_url?: string;
    audio_url?: string;
    animation_url?: string;
    description?: string;
    nft_id?: string;
    isTokenbound?: boolean;
    isNative?: boolean;
    mime_type?: string;
    collection?: {
        name?: string;
    };
    contract?: {
        type?: string;
    };
    owners?: Array<{
        owner_address: string;
        quantity: number;
    }>;
    extra_metadata?: {
        animation_original_url?: string;
    };
    symbol?: string;
    ensurance?: EnsuranceFlags;
}

export interface TokenBalance {
    chain: string;
    symbol: string;
    fungible_id?: string;
    decimals: number;
    name?: string;
    queried_wallet_balances: Array<{
        quantity_string: string;
        value_usd_string: string;
    }>;
    prices?: Array<{
        value_usd_string: string;
        marketplace_name: string;
    }>;
}

// -----------------------------------------------------------------------------
// Ensure & Ensurance Types
// -----------------------------------------------------------------------------
export type EnsureOperation = 
    | 'send' 
    | 'buy' 
    | 'sell' 
    | 'convert' 
    | 'ensure' 
    | 'hide' 
    | 'burn' 
    | 'swap' 
    | 'profile';

export interface EnsureModalProps {
    isOpen: boolean;
    onClose: () => void;
    operation: EnsureOperation;
    asset: Asset;
    address: string;
    isTokenbound: boolean;
    onAction: () => Promise<{ hash: string }>;
}

export interface EnsurancePreviewProps {
    contractAddress: string;
    group: string;
}

export interface EnsuranceForm {
    name: string;
    description: string;
}

// -----------------------------------------------------------------------------
// Validation Types
// -----------------------------------------------------------------------------
export interface ValidationReport {
    groups: {
        total: number;
        missing: string[];
        invalid: string[];
        totalSupplyMismatch: string[];
    };
    accounts: {
        total: number;
        missing: string[];
        invalid: string[];
        missingTBA: string[];
    };
    chains: {
        [key: string]: {
            total?: number;
            valid?: number;
            invalid?: number;
        };
    };
    summary: string;
}

// -----------------------------------------------------------------------------
// Tokenbound Types
// -----------------------------------------------------------------------------
import type { TokenboundClient } from "@tokenbound/sdk";

export interface TokenboundActions {
    isAccountDeployed: (params: { accountAddress: string }) => Promise<boolean>;
    createAccount?: (params: { tokenContract: string; tokenId: string }) => Promise<string>;
    executeCall?: (params: { account: string; to: string; value: string; data: string }) => Promise<{ hash: string }>;
}

// -----------------------------------------------------------------------------
// Metadata Types
// -----------------------------------------------------------------------------
export interface MetadataResponse {
    name: string;
    description: string;
    animation_url: string;
    image: string;
    tba_address: string;
    group_name: string;
    full_account_name: string;
    error?: string;
}

// -----------------------------------------------------------------------------
// Chain Types
// -----------------------------------------------------------------------------
export interface ChainDropdownProps {
    selectedChain: string;
    onChange: (chain: string) => void;
    className?: string;
    filterEnsurance?: boolean;
}

// -----------------------------------------------------------------------------
// Module Types
// -----------------------------------------------------------------------------
export interface BaseModuleProps {
  address: string;
  selectedChain: string;
  isEnsuranceTab?: boolean;
  isTokenbound: boolean;
  isOwner: boolean;
}

export interface AssetsModuleProps extends BaseModuleProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  currentGroup?: string;
}

export interface BaseTabData {
  value: string;
  label: string;
  component?: React.ComponentType<BaseModuleProps>;
  showChainDropdown?: boolean;
  isEnsuranceTab?: boolean;
}

export interface TabData extends BaseTabData {
  component: React.ComponentType<BaseModuleProps>;
  showChainDropdown?: boolean;
  isEnsuranceTab?: boolean;
}
