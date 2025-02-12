import { ensuranceContracts } from './ensurance'

// Default USD value for all certificates unless specified
export const DEFAULT_USD_VALUE = 1.00; // $1.00 USD

// Type for certificate values
type CertificateValues = {
  [chain: string]: {
    [contract: string]: {
      [tokenId: string]: number;
    };
  };
};

// Chain-specific certificate values
// Format: chain -> tokenId -> USD value
export const CERTIFICATE_VALUES: CertificateValues = {
  base: {
    // Base Ensurance Contract (using address from ensurance.ts)
    [ensuranceContracts.base]: {
      // Example special values:
      // "1": 1.50,    // TokenID 1 worth $1.50
      // "420": 0.75,  // TokenID 420 worth $0.75
      // "69": 4.20,   // TokenID 69 worth $4.20
    }
  },
  arbitrum: {
    // Arbitrum Ensurance Contract
    [ensuranceContracts.arbitrum]: {
      // Special values for Arbitrum certificates
      // Example: "1": 0.50, // Half dollar certificate
    }
  },
  optimism: {
    // Optimism Ensurance Contract
    [ensuranceContracts.optimism]: {
      // Special values for Optimism certificates
      // Example: "1": 1.25, // $1.25 certificate
    }
  }
};

// Helper function to get USD value for a certificate
export function getCertificateUsdValue(chain: string, contractAddress: string, tokenId: string): number {
  // Convert addresses to lowercase for comparison
  const normalizedContract = contractAddress.toLowerCase();
  const normalizedTokenId = tokenId.toLowerCase();
  
  // Check if there's a special value for this certificate
  const chainValues = CERTIFICATE_VALUES[chain];
  if (chainValues) {
    const contractValues = chainValues[normalizedContract];
    if (contractValues) {
      const specialValue = contractValues[normalizedTokenId];
      if (specialValue !== undefined) {
        return Number(specialValue.toFixed(2)); // Ensure 2 decimal places
      }
    }
  }

  // Return default value if no special value found
  return DEFAULT_USD_VALUE;
} 