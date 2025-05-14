import { Chain } from 'viem';

interface PrivyChain extends Chain {
  isTestnet: boolean;
  isActive: boolean;
  iconPath: string;
  viemName: string;
}

export const chainOrder = ['base', 'zora', 'arbitrum', 'optimism', 'celo', 'polygon', 'ethereum'];

export const supportedChains: PrivyChain[] = [
  {
    id: 8453,
    name: 'Base',
    viemName: 'base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.base.org'] },
    },
    blockExplorers: {
      default: { name: 'BaseScan', url: 'https://basescan.org' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/base.svg',
  },
  {
    id: 1,
    name: 'Ethereum',
    viemName: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://ethereum.publicnode.com'] },
      public: { http: ['https://ethereum.publicnode.com'] },
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://etherscan.io' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/ethereum.svg',
  },
  {
    id: 10,
    name: 'Optimism',
    viemName: 'optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.optimism.io'] },
    },
    blockExplorers: {
      default: { name: 'OptimismScan', url: 'https://optimism.io' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/optimism.svg',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    viemName: 'arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://arb1.arbitrum.io/rpc'] },
    },
    blockExplorers: {
      default: { name: 'ArbitrumScan', url: 'https://arbiscan.io' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/arbitrum.png',
  },
  {
    id: 7777777,
    name: 'Zora',
    viemName: 'zora',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.zora.energy'] },
    },
    blockExplorers: {
      default: { name: 'ZoraScan', url: 'https://zorascan.io' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/zora.png',
  },
  {
    id: 42220,
    name: 'Celo',
    viemName: 'celo',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://forno.celo.org'] },
    },
    blockExplorers: {
      default: { name: 'CeloScan', url: 'https://celoscan.org' },
    },
    isTestnet: false,
    isActive: false,
    iconPath: '/assets/icons/celo.svg',
  },
  {
    id: 137,
    name: 'Polygon',
    viemName: 'polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://polygon-rpc.com'] },
    },
    blockExplorers: {
      default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
    },
    isTestnet: false,
    isActive: true,
    iconPath: '/assets/icons/polygon.svg',
  },
];

export const getChainById = (id: number) => supportedChains.find(chain => chain.id === id);
export const getChainByName = (name: string) => supportedChains.find(chain => chain.viemName === name);

export const getActiveChains = () => {
  const activeChains = supportedChains.filter(chain => chain.isActive);
  return activeChains;
}

export const getActiveChainNames = () => getActiveChains().map(chain => chain.viemName).join(',');

export const getOrderedActiveChains = () => {
  const activeChains = getActiveChains();
  return chainOrder.filter(chain => activeChains.some(ac => ac.viemName === chain));
}

export const getChainIcon = (chain: string): string => {
  const chainConfig = getChainByName(chain);
  return chainConfig ? chainConfig.iconPath : '';
};

