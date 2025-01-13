const ADMIN_ADDRESSES = [
  '0xEAF9830bB7a38A3CEbcaCa3Ff9F626C424F3fB55',
  '0x79c2D72552Df1C5d551B812Eca906a90Ce9D840A',
  '0xcb598dD4770b06E744EbF5B31Bb3D6a538FBE4fE'
];

export const isAdmin = (address: string | undefined): boolean => {
  return address ? ADMIN_ADDRESSES.map(a => a.toLowerCase()).includes(address.toLowerCase()) : false;
};

export const getAdminAddresses = (): string[] => {
  return ADMIN_ADDRESSES;
}; 