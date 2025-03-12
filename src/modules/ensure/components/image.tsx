'use client';

import Image from 'next/image';
import { useState } from 'react';
import { EntityType } from '../types';

interface EnsureImageProps {
  src: string;
  entityType: EntityType;
  tokenId?: string | number;
  groupName?: string;
  variant?: 'circle' | 'square';
  className?: string;
  alt?: string;
}

export default function EnsureImage({ 
  src,
  entityType,
  tokenId,
  groupName,
  variant = 'square',
  className = '',
  alt = 'Image'
}: EnsureImageProps) {
  const [imageSrc, setImageSrc] = useState(src);

  const handleImageError = () => {
    // Different fallback strategies based on entity type
    if (entityType === 'account' || entityType === 'pool') {
      if (groupName && tokenId && imageSrc === src) {
        // Try group's default image
        setImageSrc(`https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/0.png`);
      } else {
        // If group default fails, use global default
        setImageSrc('https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png');
      }
    } else {
      // For other entity types, just use the global default
      setImageSrc('https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png');
    }
  };

  return (
    <div className={`relative h-full aspect-square overflow-hidden ${
      variant === 'circle' ? 'rounded-full' : 'rounded-lg'
    } ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-cover"
        onError={handleImageError}
        priority
        unoptimized
      />
    </div>
  );
} 