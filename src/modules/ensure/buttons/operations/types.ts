export type OperationResult = {
  transaction: any
  needsApproval?: boolean
  approvalData?: any
}

export type OperationParams = {
  contractAddress: string
  tokenId?: string
  amount: string
  recipient?: string
  selectedToken?: any
  userAddress: string
  pricePerToken?: bigint
  sendTo?: string
  tokenDecimals?: number
} 