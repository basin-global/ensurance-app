export const CHAIN_CONTRACTS = {
  base: [
    '0x1f98380fb1b3ae8cd097d5f9d49a7e79cd69a4fb',
    '0x7dfaa8f8e2aa32b6c2112213b395b4c9889580dd'
  ],
  zora: ['0x14b71A8E0C2c4d069cB230CC88a1423736B34096'],
  arbitrum: ['0x14b71A8E0C2c4d069cB230CC88a1423736B34096']
}

// Export the contracts directly for components that need the full list
export const ensuranceContracts = Object.values(CHAIN_CONTRACTS).flat()

export function getEnsuranceContractForChain(chain: string): string {
  const contracts = CHAIN_CONTRACTS[chain as keyof typeof CHAIN_CONTRACTS]
  return contracts ? contracts[0] : CHAIN_CONTRACTS.base[0]
}

// Helper to check if a contract address belongs to Ensurance
export function isEnsuranceToken(contractAddress: string): boolean {
  return ensuranceContracts.includes(contractAddress.toLowerCase())
} 