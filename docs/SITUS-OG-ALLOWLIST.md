# SITUS OG Allowlist Minter

A simple allowlist-based minting system for SITUS OG domains that ensures one mint per address.

## Overview

The SITUS OG Allowlist Minter consists of:

1. **Smart Contract**: `SitusOGAllowlist.sol` - Manages allowlist and minting logic
2. **Frontend Components**: React components for minting and admin management
3. **Configuration**: Contract addresses and validation utilities

## Smart Contract Features

### Core Functionality
- **Allowlist Management**: Owner can add/remove addresses from allowlist
- **One Mint Per Address**: Each allowlisted address can only mint once
- **Integration**: Direct integration with SITUS OG contract for minting
- **Security**: Reentrancy protection and proper access controls

### Key Functions
- `addToAllowlist(address[] addresses)` - Add addresses to allowlist (owner only)
- `removeFromAllowlist(address[] addresses)` - Remove addresses from allowlist (owner only)
- `mintDomain(string domainName, address referrer)` - Mint a domain (allowlisted users only)
- `isOnAllowlist(address user)` - Check if address is on allowlist
- `hasAddressMinted(address user)` - Check if address has already minted

## Frontend Components

### SitusOGMinter
Main minting interface that allows users to:
- Check their allowlist status
- View mint price and availability
- Mint domains with validation
- See transaction status and feedback

### AllowlistAdmin
Admin interface for managing the allowlist:
- Add multiple addresses to allowlist
- Remove addresses from allowlist
- Batch operations support
- Input validation and error handling

## Setup Instructions

### 1. Deploy Smart Contract

```bash
# Update the SITUS OG contract address in the deployment script
npx hardhat run scripts/deploy-situs-og-allowlist.js --network base
```

### 2. Update Configuration

Update the contract addresses in `src/modules/situs-og/config.ts`:

```typescript
export const CONTRACTS = {
  situsOG: '0x...' as `0x${string}`, // Actual SITUS OG contract address
  situsOGAllowlist: '0x...' as `0x${string}` // Deployed allowlist contract address
} as const
```

### 3. Access the Interface

Navigate to `/situs-og` to access the minting interface.

## Usage Workflow

### For Admins (Contract Owner)
1. Connect wallet with owner privileges
2. Use the AllowlistAdmin component
3. Add addresses to allowlist (one per line)
4. Monitor minting activity

### For Users
1. Connect wallet
2. Check allowlist status
3. If allowlisted and not minted, enter domain name
4. Optional: Add referrer address
5. Mint domain

## Security Features

- **Access Control**: Only contract owner can manage allowlist
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Input Validation**: Domain name and address validation
- **One Mint Limit**: Prevents multiple mints per address
- **Payment Validation**: Ensures correct payment amount

## Contract Architecture

```
SitusOGAllowlist
├── ISitusOG (interface)
├── allowlist mapping
├── hasMinted mapping
└── Owner controls
```

## Error Handling

The contract includes custom errors for better gas efficiency:
- `NotOnAllowlist()` - User not on allowlist
- `AlreadyMinted()` - User already minted
- `MintingDisabled()` - SITUS OG minting disabled
- `InvalidDomainName()` - Invalid domain name
- `InsufficientPayment()` - Incorrect payment amount

## Gas Optimization

- Custom errors instead of require statements
- Efficient storage patterns
- Minimal external calls
- Batch operations for allowlist management

## Testing

To test the contract:

```bash
npx hardhat test
```

## Deployment Checklist

- [ ] Deploy SitusOGAllowlist contract
- [ ] Verify contract on Etherscan
- [ ] Update contract addresses in config
- [ ] Test allowlist management
- [ ] Test minting functionality
- [ ] Verify integration with SITUS OG contract

## Troubleshooting

### Common Issues

1. **"Not on allowlist" error**
   - Ensure address is added to allowlist by contract owner
   - Check contract address configuration

2. **"Already minted" error**
   - Each address can only mint once
   - Use emergency reset function if needed (owner only)

3. **"Minting disabled" error**
   - Check if SITUS OG contract has minting enabled
   - Verify SITUS OG contract integration

### Emergency Functions

- `emergencyResetMinted(address user)` - Reset minted status (owner only)
- `withdraw()` - Withdraw contract balance (owner only)

## Integration with Existing App

The SITUS OG allowlist minter integrates seamlessly with the existing Ensurance App:

- Uses existing UI components and styling
- Follows established patterns for contract interaction
- Leverages existing wallet connection infrastructure
- Maintains consistency with app architecture

## Future Enhancements

Potential improvements:
- Merkle tree allowlist for gas efficiency
- Batch minting capabilities
- Advanced admin controls
- Analytics and reporting
- Integration with existing certificate system