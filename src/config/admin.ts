const APP_ADMIN_ADDRESSES = [
  '0xEAF9830bB7a38A3CEbcaCa3Ff9F626C424F3fB55',
  '0x79c2D72552Df1C5d551B812Eca906a90Ce9D840A',
  '0xcb598dD4770b06E744EbF5B31Bb3D6a538FBE4fE',
  '0xf843373b1561A362d1410316C8C215719a2FA44b',
  '0x7EdDce062a290c59feb95E2Bd7611eeE24610A6b'
];

export const isAppAdmin = (address: string | undefined): boolean => {
  return address ? APP_ADMIN_ADDRESSES.map(a => a.toLowerCase()).includes(address.toLowerCase()) : false;
};

export const getAppAdminAddresses = (): string[] => {
  return APP_ADMIN_ADDRESSES;
}; 