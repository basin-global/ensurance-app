import useSWR from 'swr'
import { userDataConfig } from '@/lib/swr-config'

export interface GeneralCertificate {
  contract_address: string
  name: string
  description?: string
  image_url?: string
  total_supply?: number
  market_data?: {
    floor_price?: string
    volume_24h?: string
  }
}

export interface SpecificCertificate {
  tokenId: string
  tokenURI: string
  metadata?: {
    name?: string
    description?: string
    image?: string
    attributes?: Array<{
      trait_type: string
      value: string | number
    }>
  }
  owner?: string
}

export function useGeneralCertificates() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<GeneralCertificate[]>(
    '/api/general',
    userDataConfig
  )

  return {
    certificates: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useGeneralCertificate(contractAddress?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<GeneralCertificate>(
    contractAddress ? `/api/general?contract=${contractAddress}` : null,
    userDataConfig
  )

  return {
    certificate: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useSpecificCertificates() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<SpecificCertificate[]>(
    '/api/specific',
    userDataConfig
  )

  return {
    certificates: data || [],
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}

export function useSpecificCertificate(contractAddress?: string, tokenId?: string) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<SpecificCertificate>(
    contractAddress && tokenId ? `/api/specific?contract=${contractAddress}&tokenId=${tokenId}` : null,
    userDataConfig
  )

  return {
    certificate: data,
    isLoading,
    isValidating,
    error,
    refetch: mutate,
  }
}