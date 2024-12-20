export const ensuranceContracts = {
  base: '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb',
  zora: '0x14b71a8e0c2c4d069cb230cc88a1423736b34096',
  arbitrum: '0xc6e4e6e5a11e70af6334bf3274f4d4c2e0ce3571',
  optimism: '0x5c738cdf228d8c6e8dc68a94b08be7d8958bcccf'
} as const;

export type EnsuranceChain = keyof typeof ensuranceContracts;

// Helper functions
export function isEnsuranceToken(chain: string, contractAddress: string): boolean {
  return Object.entries(ensuranceContracts).some(([c, address]) => 
    c === chain && address.toLowerCase() === contractAddress.toLowerCase()
  );
}

export function getEnsuranceContractForChain(chain: string): string | undefined {
  return ensuranceContracts[chain as EnsuranceChain];
}
