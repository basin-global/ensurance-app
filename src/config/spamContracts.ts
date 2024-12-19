import { ActiveChain } from '@/lib/simplehash';

type SpamContractConfig = {
  [chain in ActiveChain]?: string[];
};

export const spamContracts: SpamContractConfig = {
  ethereum: [
    // Add more Ethereum spam contract addresses
  ],
  polygon: [
    '0x43d594b94ab5cb886b3e26b18cd52c94c506f404', // Note: stored in lowercase
    '0x86f1b5d1E5D0969dbBC03D4Bf524A758346cbA20',
    '0xf2f420D079c3FADF20606d077dDE9aB322FC8931',
    '0x0a53A66d7F74233d3Ae7c2301aa26507c766E5e9',
    '0x26c41510cC03269c7fE12e9e0a3057cB325240da',
    '0x5583f33e27567897C240be9B019AdA988e6c5cf9',
    '0x231D6945078817C2f008B4026263F1d34e332391',
    // Add more Polygon spam contract addresses
  ],
  arbitrum: [
    // Add Arbitrum spam contract addresses
  ],
  optimism: [
    '0x419349C932a106543008570B6aA3Fd9068EE39DD',
    '0x51A38E959B7a05CE393bb47c2B40d00e50541177',
    // Add Optimism spam contract addresses
  ],
  zora: [
    // Add Zora spam contract addresses
  ],
  base: [
    '0xeb62e1f0A865fe99468FBCdeFBa5a1f63B01Fc7f',
    '0xd248fe2929e7ea707c4546f0b964f3d8255d4968',
    '0xCE8486111f3FfA8a4cfA018C4F42c6F79729C88C',
    '0x282A0745dBB8e14a0E796c30FDc63764751aC581',
    '0x2F720426b882b9BAb564c9bb036E2ae8b34EBcbE',
    '0x48b7446ced56848580348d06b4fb84d4b5824130',
    '0x47759df99EAc1cA21e356a52b905b57749a757D7',
    // Add Base spam contract addresses
  ],
  celo: [
    '0x76FfdE7BF6dD1B7343d61C0B83a92ADb3A844cD0',
  ],
  // Add other chains as needed
};

export function isSpamContract(chain: ActiveChain, contractAddress: string): boolean {
  console.log(`Checking if ${contractAddress} on chain ${chain} is spam`);
  const chainSpamContracts = spamContracts[chain];
  if (!chainSpamContracts) {
    console.log(`No spam contracts defined for chain ${chain}`);
    return false;
  }
  
  // Remove the chain prefix if it exists
  const cleanAddress = contractAddress.includes('.') ? contractAddress.split('.')[1] : contractAddress;
  const lowercaseAddress = cleanAddress.toLowerCase();
  
  const isSpam = chainSpamContracts.some(spamAddress => 
    spamAddress.toLowerCase() === lowercaseAddress
  );
  console.log(`Is ${contractAddress} spam: ${isSpam}`);
  return isSpam;
}
