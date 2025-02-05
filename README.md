# ensurance.app

The official frontend application for Natural Capital Ensurance, a protocol that reduces systemic risk and ensures resilience through the protection of natural capital.

## Overview

Natural Capital Ensurance safeguards 14 stocks and 19 flows of natural capital, ensuring ecosystem function across:
- Stocks: forests, wetlands, grasslands, urban and coastal ecosystems
- Flows: clean air, water, food, energy, climate stability, risk resilience, and additional cultural and ecological benefits

The application integrates with:
- elizaOS for agent operations
- Ethereum and L2 networks (Base, Zora, Arbitrum, Optimism)
- BASIN SITUS Protocol

### Flexible Implementation

This application is designed to be:
- A comprehensive client that anyone can connect to using their own elizaOS instance (with Ensurance plugin and SITUS Accounts)
- A forkable and customizable foundation where users can:
  - Enable specific groups or a subset of groups
  - Customize the interface for particular use cases
  - Build specialized versions for specific natural capital applications

## Features

- **Certificates of Ensurance**: Issue and manage certificates that fund natural assets and ecosystem services
- **Agent Integration**: Semi-autonomous actions via elizaOS
- **Multi-Chain Support**: Deploy and manage assets across multiple networks
- **$ENSURE Integration**: Nature-based currency mechanisms
- **Ensurance Pools**: Manage and participate in collaborative funding structures
- **Real-time Analytics**: Track and analyze natural capital metrics

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn or npm
- A modern web browser
- MetaMask or other Web3 wallet

### Installation

1. Clone the repository:
```bash
git clone https://github.com/basin-global/ensurance-app.git
cd ensurance-app
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env.local` file with required environment variables:
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SPLITS_API_KEY=your_splits_api_key
SIMPLEHASH_API_KEY=your_simplehash_api_key
```

4. Start the development server:
```bash
yarn dev
```

The app will be available at `http://localhost:3000`

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_PRIVY_APP_ID`: Privy authentication app ID
- `PRIVY_APP_SECRET`: Privy app secret for server operations
- `NEXT_PUBLIC_SPLITS_API_KEY`: API key for Splits integration
- `SIMPLEHASH_API_KEY`: API key for SimpleHash NFT data

## Architecture

The application is built with:
- Next.js 13+ (App Router)
- TypeScript
- Tailwind CSS
- Privy for authentication
- IPFS for decentralized storage
- Vercel Postgres for data persistence

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md) for responsible disclosure.

## License

This project incorporates work under multiple licenses:

- **BASIN Natural Capital Frameworks and Ensurance**: CC BY-NC-SA 4.0 - Used with permission
  (See: https://docs.basin.global/dossier/formalities/license)
- **SITUS**: GNU General Public License v3.0
- **ElizaOS**: MIT License

See the [LICENSE](LICENSE) file for complete details.

## Links

- [Website](https://ensurance.app)
- [Documentation](https://ensurance.app/docs)
- [Twitter](https://twitter.com/ensurance_app)

## Support

For support, please:
1. Check our [Documentation](https://ensurance.app/docs)
2. Open an issue in this repository
3. Contact us through our [support channels](https://ensurance.app/support) 