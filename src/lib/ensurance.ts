import { Asset, EnsuranceFlags } from '@/types';
import { PortfolioToken, ERC20Token, NFTToken } from '@/modules/account-modules/portfolio/types';
import { CONTRACTS } from '@/modules/specific/config';

interface GeneralCertificate {
  contract_address: string;
  // Add other fields as needed
}

interface Group {
  contract_address: string;
  // Add other fields as needed
}

/**
 * Converts a PortfolioToken to an Asset for ensurance checking
 */
function portfolioTokenToAsset(token: PortfolioToken): Asset {
  // Handle each token type appropriately
  if (token.type === 'native') {
    return {
      chain: 'base',
      contract_address: token.address,
      token_id: '0',
      contract: {
        type: undefined
      },
      name: token.name,
      symbol: token.symbol,
      ensurance: undefined
    };
  }

  if (token.type === 'erc20') {
    const erc20Token = token as ERC20Token;
    return {
      chain: 'base',
      contract_address: erc20Token.contractAddress,
      token_id: '0',
      contract: {
        type: 'erc20'
      },
      name: token.name,
      symbol: token.symbol,
      ensurance: undefined
    };
  }

  // For ERC721 and ERC1155
  const nftToken = token as NFTToken;
  return {
    chain: 'base',
    contract_address: nftToken.contractAddress,
    token_id: nftToken.tokenId,
    contract: {
      type: nftToken.type
    },
    name: token.name,
    symbol: token.symbol,
    ensurance: undefined
  };
}

/**
 * Identifies if assets are Ensurance assets by checking their contracts against known Ensurance contracts.
 * 
 * Note: This is different from the database-level isEnsurance check (in accounts.ts) which
 * is used to identify if a group is the ensurance group and include additional fields
 * like stock_or_flow and display_name in database queries.
 * 
 * This function is specifically for identifying Ensurance assets in the UI/portfolio context.
 */
export async function identifyEnsuranceAssets(assets: Asset[]): Promise<Asset[]> {
  try {
    console.log('Starting ensurance check for assets:', assets.map(a => ({
      name: a.name,
      contract_address: a.contract_address,
      type: a.contract?.type
    })));

    // Fetch known contracts in parallel
    const [generalResponse, groupsResponse] = await Promise.all([
      fetch('/api/general'),
      fetch('/api/groups')
    ]);

    if (!generalResponse.ok || !groupsResponse.ok) {
      console.error('Failed to fetch contract data:', {
        general: generalResponse.status,
        groups: groupsResponse.status
      });
      return assets;
    }

    const generalCertificates = await generalResponse.json();
    const groups = await groupsResponse.json();

    console.log('Fetched contracts:', {
      generalCertificates: generalCertificates.map((c: any) => c.contract_address),
      groups: groups.map((g: any) => g.contract_address),
      specific: CONTRACTS.specific
    });

    // Create lookup sets for faster checking
    const generalContracts = new Set(generalCertificates.map((c: any) => c.contract_address?.toLowerCase()));
    const groupContracts = new Set(groups.map((g: any) => g.contract_address?.toLowerCase()));
    const specificContract = CONTRACTS.specific.toLowerCase();

    // Process each asset
    const assetsWithEnsurance = assets.map(asset => {
      if (!asset.contract_address) {
        console.log('Asset has no contract address:', asset);
        return asset;
      }

      const contractAddress = asset.contract_address.toLowerCase();
      const ensurance: EnsuranceFlags = {
        isEnsuranceGeneral: asset.contract?.type === 'erc20' && generalContracts.has(contractAddress),
        isEnsuranceSpecific: contractAddress === specificContract, // Just check the contract address
        isEnsuranceGroup: asset.contract?.type === 'erc721' && groupContracts.has(contractAddress)
      };

      console.log('Processing asset:', {
        contractAddress,
        type: asset.contract?.type,
        ensurance
      });

      return {
        ...asset,
        ensurance
      };
    });

    console.log('Assets with ensurance flags:', assetsWithEnsurance.map(a => ({
      name: a.name,
      ensurance: a.ensurance
    })));

    return assetsWithEnsurance;
  } catch (error) {
    console.error('Error identifying Ensurance assets:', error);
    return assets;
  }
}

/**
 * Identifies if portfolio tokens are Ensurance assets by checking their contracts against known Ensurance contracts.
 */
export async function identifyEnsurancePortfolioTokens(tokens: PortfolioToken[]): Promise<PortfolioToken[]> {
  try {
    // Debug log the incoming tokens
    console.log('Raw tokens from wallet:', JSON.stringify(tokens, null, 2));

    // Fetch known contracts in parallel
    const [generalResponse, groupsResponse] = await Promise.all([
      fetch('/api/general'),
      fetch('/api/groups')
    ]);

    if (!generalResponse.ok || !groupsResponse.ok) {
      console.error('Failed to fetch contract data:', {
        general: generalResponse.status,
        groups: groupsResponse.status
      });
      return tokens;
    }

    const generalCertificates = await generalResponse.json();
    const groups = await groupsResponse.json();

    // Debug log the contract lists
    console.log('Ensurance contracts:', {
      general: generalCertificates.map((c: any) => c.contract_address),
      groups: groups.map((g: any) => g.contract_address),
      specific: CONTRACTS.specific
    });

    // Simple array of contract addresses to check against
    const ensuranceContracts = [
      ...generalCertificates.map((c: any) => c.contract_address?.toLowerCase()),
      ...groups.map((g: any) => g.contract_address?.toLowerCase()),
      CONTRACTS.specific?.toLowerCase()
    ].filter(Boolean);

    // Process each token
    const tokensWithEnsurance = tokens.map(token => {
      // For ERC20 tokens, use the address property
      const addressToCheck = token.address;

      // Debug log each token check
      console.log('Checking token:', {
        name: token.name,
        type: token.type,
        address: addressToCheck,
        ensuranceContracts
      });

      if (!addressToCheck) {
        console.warn('No address found for token:', token);
        return token;
      }

      const ensurance: EnsuranceFlags = {
        isEnsuranceGeneral: token.type === 'erc20' && ensuranceContracts.includes(addressToCheck.toLowerCase()),
        isEnsuranceSpecific: addressToCheck.toLowerCase() === CONTRACTS.specific?.toLowerCase(),
        isEnsuranceGroup: (token.type === 'erc721' || token.type === 'erc1155') && ensuranceContracts.includes(addressToCheck.toLowerCase())
      };

      return {
        ...token,
        ensurance
      };
    });

    return tokensWithEnsurance;
  } catch (error) {
    console.error('Error identifying Ensurance tokens:', error);
    return tokens;
  }
} 