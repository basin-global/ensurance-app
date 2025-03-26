// Chain-specific contract addresses
export const ensuranceContracts = {
  base: '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb',
  zora: '0x14b71A8E0C2c4d069cB230CC88a1423736B34096',
  arbitrum: '0xc6e4e6e5a11e70af6334bf3274f4d4c2e0ce3571',
  optimism: '0x5c738cdf228d8c6e8dc68a94b08be7d8958bcccf'
} as const;

export const isEnsuranceToken = (chain: string, contract: string): boolean => {
  // Placeholder - will be implemented later when Ensurance tokens are added
  if (!chain || !contract) return false;
  return ensuranceContracts[chain as keyof typeof ensuranceContracts]?.toLowerCase() === contract?.toLowerCase();
}

export const getEnsuranceContractForChain = (chain: string): string | undefined => {
  return ensuranceContracts[chain as keyof typeof ensuranceContracts];
}

export const getCertificateUsdValue = (chain: string, contract: string, tokenId: string): number => {
  // Placeholder - will be implemented later when pricing is added
  return 1.00;
} 