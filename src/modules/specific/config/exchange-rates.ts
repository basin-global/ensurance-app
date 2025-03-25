// Default USD value for certificates
const DEFAULT_CERTIFICATE_VALUE = 100

export function getCertificateUsdValue(tokenId?: string): number {
  // For now, return a default value. This can be enhanced later with actual price data
  return DEFAULT_CERTIFICATE_VALUE
} 