interface ERC20Config {
  address: `0x${string}`
  symbol: string
  decimals: number
}

interface ChainERC20Config {
  [key: string]: ERC20Config
}

export const supportedERC20s: { [chainId: string]: ChainERC20Config } = {
  'base': {
    'ENSURE': {
      address: '0x0c66d591d1ff5944A44aebB65c33f6B6e82a124F',
      symbol: 'ENSURE',
      decimals: 18
    },
    'USDC': {
      address: '0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6
    }
  },
  // Add other chains as needed
  'zora': {
    'USDC': {
      address: '0x0000000000000000000000000000000000000000', // TODO: Add Zora USDC address
      symbol: 'USDC',
      decimals: 6
    }
  }
}
