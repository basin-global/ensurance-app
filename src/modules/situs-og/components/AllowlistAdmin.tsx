'use client'

import { useState } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, XCircle, Plus, Minus } from 'lucide-react'
import { CONTRACTS, ABIS } from '../config'

interface AllowlistAdminProps {
  className?: string
}

export function AllowlistAdmin({ className }: AllowlistAdminProps) {
  const { address, isConnected } = useAccount()
  const [addresses, setAddresses] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Contract writes
  const { 
    data: addData, 
    write: addToAllowlist, 
    isLoading: addLoading,
    error: addError 
  } = useContractWrite({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'addToAllowlist'
  })

  const { 
    data: removeData, 
    write: removeFromAllowlist, 
    isLoading: removeLoading,
    error: removeError 
  } = useContractWrite({
    address: CONTRACTS.situsOGAllowlist,
    abi: ABIS.situsOGAllowlist,
    functionName: 'removeFromAllowlist'
  })

  // Wait for transactions
  const { isLoading: addTxLoading, isSuccess: addTxSuccess } = useWaitForTransaction({
    hash: addData?.hash
  })

  const { isLoading: removeTxLoading, isSuccess: removeTxSuccess } = useWaitForTransaction({
    hash: removeData?.hash
  })

  // Handle add to allowlist
  const handleAddToAllowlist = () => {
    const addressList = addresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    if (addressList.length === 0) {
      setError('Please enter at least one address')
      return
    }

    // Validate addresses
    const invalidAddresses = addressList.filter(addr => !/^0x[a-fA-F0-9]{40}$/.test(addr))
    if (invalidAddresses.length > 0) {
      setError(`Invalid addresses: ${invalidAddresses.join(', ')}`)
      return
    }

    setError(null)
    setSuccess(null)

    addToAllowlist({
      args: [addressList]
    })
  }

  // Handle remove from allowlist
  const handleRemoveFromAllowlist = () => {
    const addressList = addresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    if (addressList.length === 0) {
      setError('Please enter at least one address')
      return
    }

    // Validate addresses
    const invalidAddresses = addressList.filter(addr => !/^0x[a-fA-F0-9]{40}$/.test(addr))
    if (invalidAddresses.length > 0) {
      setError(`Invalid addresses: ${invalidAddresses.join(', ')}`)
      return
    }

    setError(null)
    setSuccess(null)

    removeFromAllowlist({
      args: [addressList]
    })
  }

  // Handle success
  if (addTxSuccess) {
    setSuccess('Addresses added to allowlist successfully!')
    setAddresses('')
  }

  if (removeTxSuccess) {
    setSuccess('Addresses removed from allowlist successfully!')
    setAddresses('')
  }

  // Handle errors
  if (addError) {
    setError(addError.message || 'Failed to add addresses to allowlist')
  }

  if (removeError) {
    setError(removeError.message || 'Failed to remove addresses from allowlist')
  }

  // Loading states
  const isLoading = addLoading || removeLoading || addTxLoading || removeTxLoading

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Allowlist Admin</CardTitle>
          <CardDescription>
            Connect your wallet to manage the allowlist
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
        <CardTitle>Allowlist Admin</CardTitle>
        <CardDescription>
          Add or remove addresses from the SITUS OG allowlist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Address Input */}
        <div>
          <label htmlFor="addresses" className="block text-sm font-medium mb-2">
            Addresses (one per line)
          </label>
          <Textarea
            id="addresses"
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
            placeholder="0x1234...&#10;0x5678...&#10;0x9abc..."
            rows={5}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Enter Ethereum addresses, one per line
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleAddToAllowlist}
            disabled={!addresses.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add to Allowlist
              </>
            )}
          </Button>

          <Button
            onClick={handleRemoveFromAllowlist}
            disabled={!addresses.trim() || isLoading}
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Minus className="mr-2 h-4 w-4" />
                Remove from Allowlist
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <Alert>
          <AlertDescription>
            <strong>Instructions:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Enter Ethereum addresses, one per line</li>
              <li>Use "Add to Allowlist" to grant minting access</li>
              <li>Use "Remove from Allowlist" to revoke access</li>
              <li>Only the contract owner can manage the allowlist</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}