export type CreateTokenStatus = {
  status: 'preparing' | 'uploading' | 'confirming' | 'complete' | 'error';
  tokenId?: string;
  error?: string;
}

export type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  thumbnail?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface SpecificMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  content: {
    mime: string;
    uri: string;
  };
} 