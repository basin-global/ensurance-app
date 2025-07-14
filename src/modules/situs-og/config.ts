import { base } from 'viem/chains'
import type { Address } from 'viem'
import { createPublicClient, http } from 'viem'
import situsOGAbi from '@/abi/SitusOG.json'
import situsOGAllowlistAbi from '@/abi/SitusOGAllowlist.json'

// Network config
export const NETWORK = {
  id: base.id,
  name: base.name,
  rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
} as const

// Contract addresses (update these with actual deployed addresses)
export const CONTRACTS = {
  situsOG: '0x...' as `0x${string}`, // Update with actual SITUS OG contract address
  situsOGAllowlist: '0x...' as `0x${string}` // Update with deployed allowlist contract address
} as const

// Public client
export const publicClient = createPublicClient({
  chain: base,
  transport: http(NETWORK.rpcUrl)
})

// Contract ABIs
export const ABIS = {
  situsOG: situsOGAbi,
  situsOGAllowlist: situsOGAllowlistAbi
} as const

// Helper functions
export function isSitusOGContract(address: Address): boolean {
  return address.toLowerCase() === CONTRACTS.situsOG.toLowerCase()
}

export function isSitusOGAllowlistContract(address: Address): boolean {
  return address.toLowerCase() === CONTRACTS.situsOGAllowlist.toLowerCase()
}

// Types
export interface MintStatus {
  isOnAllowlist: boolean
  hasMinted: boolean
  isMintingEnabled: boolean
  mintPrice: bigint
}

export interface MintParams {
  domainName: string
  referrer?: string
}

// Validation functions
export const validateDomainName = (domainName: string): string | null => {
  if (!domainName || domainName.trim().length === 0) {
    return 'Domain name is required'
  }
  
  const trimmed = domainName.trim()
  if (trimmed.length < 1) {
    return 'Domain name must be at least 1 character'
  }
  
  if (trimmed.length > 50) {
    return 'Domain name must be less than 50 characters'
  }
  
  // Basic validation - only allow alphanumeric and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return 'Domain name can only contain letters, numbers, and hyphens'
  }
  
  return null
}

export const validateReferrer = (referrer: string): string | null => {
  if (!referrer || referrer.trim().length === 0) {
    return null // Referrer is optional
  }
  
  const trimmed = referrer.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return 'Referrer must be a valid Ethereum address'
  }
  
  return null
}

// Formatting functions
export const formatEthAmount = (amount: bigint): string => {
  const ethAmount = Number(amount) / 1e18
  return ethAmount.toFixed(6)
}

export const parseEthAmount = (amount: string): bigint => {
  const ethAmount = parseFloat(amount)
  if (isNaN(ethAmount)) return BigInt(0)
  return BigInt(Math.floor(ethAmount * 1e18))
}