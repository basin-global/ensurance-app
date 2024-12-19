// components/AccountImage.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

type ImageVariant = 'circle' | 'square';

interface AccountImageProps {
  tokenId: string | number;
  variant?: ImageVariant;
  className?: string;
}

export default function AccountImage({ 
  tokenId, 
  variant = 'circle',
  className = ''
}: AccountImageProps) {
  const { currentOG } = useOG();
  const ogType = currentOG?.og_name?.replace('.', '') || '';
  const [imageExists, setImageExists] = useState(true);

  const imageUrl = `${process.env.NEXT_PUBLIC_BLOB_URL}/${ogType}/${tokenId}.png`;
  
  console.log('AccountImage Debug:', {
    tokenId,
    ogType,
    og_name: currentOG?.og_name,
    imageUrl,
    imageExists,
    BLOB_URL: process.env.NEXT_PUBLIC_BLOB_URL
  });

  if (!imageExists) return null;

  const containerClasses = `relative h-full aspect-square overflow-hidden ${
    variant === 'circle' ? 'rounded-full' : 'rounded-lg'
  } ${className}`;

  return (
    <div className={containerClasses}>
      <Image
        src={imageUrl}
        alt={`Token ${tokenId} image`}
        fill
        className="object-cover"
        onError={() => setImageExists(false)}
        priority
      />
    </div>
  );
}