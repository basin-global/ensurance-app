// components/AccountImage.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

type ImageVariant = 'circle' | 'square';
type ImageType = 'orbs' | 'banners';
type ImageExtension = 'png' | 'jpg';

interface AccountImageProps {
  tokenId: string | number;
  variant?: ImageVariant;
  className?: string;
  imageType?: ImageType;
}

export default function AccountImage({ 
  tokenId, 
  variant = 'circle',
  className = '',
  imageType = 'orbs'
}: AccountImageProps) {
  const [imageExists, setImageExists] = useState(true);

  // Determine file extension based on imageType
  const extension: ImageExtension = imageType === 'banners' ? 'jpg' : 'png';
  const imageUrl = `/groups/${imageType}/${tokenId}.${extension}`;
  
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