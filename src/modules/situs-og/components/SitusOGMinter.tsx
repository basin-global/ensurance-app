'use client'

import { useState, useEffect } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { CONTRACTS, ABIS, validateDomainName, validateReferrer, formatEthAmount } from '../config'

interface SitusOGMinterProps {
  className?: string
}

export function SitusOGMinter({ className }: SitusOGMinterProps) {
  const { address, isConnected } = useAccount()
  const [domainName, setDomainName] = useState('')
  const [referrer, setReferrer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Contract reads
  const { data: mintPrice, isLoading: priceLoading } = useContractRead({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'getMintPrice',
    watch: true
  })

  const { data: isOnAllowlist, isLoading: allowlistLoading } = useContractRead({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'isOnAllowlist',
    args: address ? [address] : undefined,
    enabled: !!address,
    watch: true
  })

  const { data: hasMinted, isLoading: mintedLoading } = useContractRead({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'hasAddressMinted',
    args: address ? [address] : undefined,
    enabled: !!address,
    watch: true
  })

  const { data: isMintingEnabled, isLoading: enabledLoading } = useContractRead({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'isMintingEnabled',
    watch: true
  })

  // Contract write
  const { 
    data: mintData, 
    write: mintDomain, 
    isLoading: mintLoading,
    error: mintError 
  } = useContractWrite({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'mintDomain'
  })

  // Wait for transaction
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransaction({
    hash: mintData?.hash
  })

  // Handle mint
  const handleMint = () => {
    // Validate inputs
    const domainError = validateDomainName(domainName)
    if (domainError) {
      setError(domainError)
      return
    }

    const referrerError = validateReferrer(referrer)
    if (referrerError) {
      setError(referrerError)
      return
    }

    if (!mintPrice) {
      setError('Unable to get mint price')
      return
    }

    setError(null)
    setSuccess(null)

    mintDomain({
      args: [
        domainName.trim(),
        referrer || '0x0000000000000000000000000000000000000000'
      ],
      value: mintPrice
    })
  }

  // Handle success
  useEffect(() => {
    if (txSuccess) {
      setSuccess('Domain minted successfully!')
      setDomainName('')
      setReferrer('')
    }
  }, [txSuccess])

  // Handle error
  useEffect(() => {
    if (mintError) {
      setError(mintError.message || 'Failed to mint domain')
    }
  }, [mintError])

  // Loading states
  const isLoading = priceLoading || allowlistLoading || mintedLoading || enabledLoading || mintLoading || txLoading

  // Check if user can mint
  const canMint = isConnected && 
    isOnAllowlist && 
    !hasMinted && 
    isMintingEnabled && 
    domainName.trim()

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SITUS OG Allowlist Minter</CardTitle>
          <CardDescription>
            Connect your wallet to mint a SITUS OG domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to continue
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>SITUS OG Allowlist Minter</CardTitle>
        <CardDescription>
          Mint your SITUS OG domain (one per allowlisted address)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {allowlistLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isOnAllowlist ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Allowlist Status: {isOnAllowlist ? 'Whitelisted' : 'Not Whitelisted'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {mintedLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasMinted ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Mint Status: {hasMinted ? 'Already Minted' : 'Not Minted'}</span>
          </div>

          <div className="flex items-center gap-2">
            {enabledLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isMintingEnabled ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Minting: {isMintingEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        {/* Price */}
        {mintPrice && (
          <div className="text-sm text-muted-foreground">
            Mint Price: {formatEthAmount(mintPrice)} ETH
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Mint Form */}
        {isOnAllowlist && !hasMinted && isMintingEnabled && (
          <div className="space-y-4">
            <div>
              <label htmlFor="domainName" className="block text-sm font-medium mb-2">
                Domain Name
              </label>
              <Input
                id="domainName"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="Enter domain name (e.g., mydomain)"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="referrer" className="block text-sm font-medium mb-2">
                Referrer (Optional)
              </label>
              <Input
                id="referrer"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleMint}
              disabled={!canMint || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint Domain'
              )}
            </Button>
          </div>
        )}

        {/* Cannot mint message */}
        {(!isOnAllowlist || hasMinted || !isMintingEnabled) && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {!isOnAllowlist && 'You are not on the allowlist'}
              {hasMinted && 'You have already minted a domain'}
              {!isMintingEnabled && 'Minting is currently disabled'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}