// =============================================================================
// Situs Types
// This file defines TypeScript interfaces and types specific to the Situs project.
// These types are used throughout the application to ensure type safety and provide
// better developer experience with autocompletion and error checking.
// =============================================================================

// -----------------------------------------------------------------------------
// OG & Account Core Types
// -----------------------------------------------------------------------------
export interface OG {
    contract_address: string;
    og_name: string; // Expected to always start with a dot (e.g., ".example")
    name: string;    // OG Name from OGs.json
    email: string;   // OG Email from OGs.json
    name_front?: string;
    tagline?: string;
    description?: string;
    chat?: string;
    total_supply: number;
    website?: string;
    group_ensurance?: string | boolean;
}

export type OgConfig = OG;

export interface OgAccount {
    tba_address: string;
    account_name: string;
    token_id: number;
    created_at?: string;
    owner_of?: string;
    description?: string;
}

export interface AllAccountsProps {
    og: string;
    accounts: OgAccount[];
    searchQuery: string;
    hideOgSuffix?: boolean;
    showCreateOption?: boolean;
    getAccountUrl?: (account: OgAccount) => string;
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

export interface Asset extends BaseAsset {
    name?: string;
    image_url?: string;
    video_url?: string;
    audio_url?: string;
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
    og: string;
}

export interface EnsuranceForm {
    name: string;
    description: string;
}

// -----------------------------------------------------------------------------
// Validation Types
// -----------------------------------------------------------------------------
export interface ValidationReport {
    ogs: {
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
    og_name: string;
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

// Add a new interface for the base configuration
export interface BaseTabData {
  value: string;
  label: string;
  showChainDropdown?: boolean;
  isEnsuranceTab?: boolean;
  component?: React.ComponentType<BaseModuleProps>;
}

// Keep the original TabData interface for the fully configured tabs
export interface TabData extends BaseTabData {
  component: React.ComponentType<BaseModuleProps>;
}
