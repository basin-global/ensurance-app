// components/AccountImage.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AccountImageProps {
  tokenId: string | number;
  groupName: string;
  variant?: 'circle' | 'square';
  className?: string;
}

export default function AccountImage({ 
  tokenId, 
  groupName,
  variant = 'circle',
  className = ''
}: AccountImageProps) {
  const [imageExists, setImageExists] = useState(true);

  // Use the groupName to construct the URL
  const imageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/generated/${tokenId}.png`;
  
  if (!imageExists) return null;

  const containerClasses = `relative h-full aspect-square overflow-hidden ${
    variant === 'circle' ? 'rounded-full' : 'rounded-lg'
  } ${className}`;

  return (
    <div className={containerClasses}>
      <Image
        src={imageUrl}
        alt={`Account ${tokenId} image`}
        fill
        className="object-cover"
        onError={() => setImageExists(false)}
        priority
      />
    </div>
  );
}