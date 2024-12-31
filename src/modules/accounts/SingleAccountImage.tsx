'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SingleAccountImageProps {
  tokenId: string | number;
  groupName: string;
  variant?: 'circle' | 'square';
  className?: string;
}

export default function SingleAccountImage({ 
  tokenId, 
  groupName,
  variant = 'circle',
  className = ''
}: SingleAccountImageProps) {
  const [imageSrc, setImageSrc] = useState(
    `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/${tokenId}.png`
  );

  const handleImageError = () => {
    if (imageSrc.includes(`/${groupName}/${tokenId}.png`)) {
      // Try group's default image (0.png)
      setImageSrc(`https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/0.png`);
    } else if (imageSrc.includes(`/${groupName}/0.png`)) {
      // If group default fails, use global default
      setImageSrc('https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png');
    }
  };

  return (
    <div className={`relative h-full aspect-square overflow-hidden ${
      variant === 'circle' ? 'rounded-full' : 'rounded-lg'
    } ${className}`}>
      <Image
        src={imageSrc}
        alt={`Account ${tokenId}`}
        fill
        className="object-cover"
        onError={handleImageError}
        priority
      />
    </div>
  );
} 